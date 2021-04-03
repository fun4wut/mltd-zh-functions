import _axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import promiseRetry from 'promise-retry'
import fs from 'fs'
import tmpUtil from 'tmp'
import path from 'path'

import { decRes, encReq } from './magic'
import { createReq, RankType, ReqMethod } from './defs'
import { IEvtRank } from '../types'
import { Operator } from '../operator'

const BaseUrl = 'https://theaterdays-zh.appspot.com'
// login用的body，因为不需要动，所以直接传上去就行
const loginData = `KtVpqYbkiwRihnt9XJGofjuysiUpPC4WMM-qnNKCIvbDJoj-dvDKp6XJRnaMuLPBuEKRdTR9rkqX3g9hzXXeaiPgwBNIZNjT-2z5-3JNTRQ3gXfAF7pqsddqU0Is_ZQiyCAwI1nj0gr1h4ZpCz3l0KYT_j-7i3fhUm3CpA0O7TF_lN9kKdoahVZaS10pc6HlgloTpBaVqU6t6yWOLg1XHZ5LZ65qdd8kgBx-UYvKkT8omordtRxJGuh0TrI1wlpWiyYpr7PVqgrY6YpIG8_WjearbdGn_3QVrNT2hrlMjELsUAi3FIuKQxzBbauRFxK2ShpJhD-WUewdWomg0wSVdx0eqZ6ctk69j97pak4QlbXZlhVeTiu88Zwq1-8uSobqWrU2oqLCh8SLfIkIWbi441WvWJs5odWLteFHsbnMNFL28ohKCKSUXhW8bwlXLBhQ`

const cachePath = path.join(
  tmpUtil.tmpdir,
  `.auth_cache_${loginData.substr(0, 10)}`
)

const getAuth = () => {
  if (fs.existsSync(cachePath)) {
    return fs
      .readFileSync(cachePath, {
        flag: 'r+',
      })
      .toString('utf-8')
  } else {
    fs.writeFileSync(cachePath, '')
    return ''
  }
}

const setAuth = (s: string) => fs.promises.writeFile(cachePath, s)

const axios = _axios.create({
  baseURL: BaseUrl,
  proxy: false,
  httpsAgent:
    process.env.NODE_ENV === 'prod'
      ? undefined
      : new HttpsProxyAgent('http://winip:1080'),
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAuth()}`,
    'X-Application-Platform': 'google',
    'X-Application-Version': '2.0.050',
    'X-Unity-Version': '2018.4.30f1',
    'X-Device-Time': '2021-03-20T10:38:10.287726+08:00',
    'X-Device-Name': 'OnePlus ONEPLUS A5000',
    'X-Os-Name': 'android',
    'X-Os-Version': '8.1.0',
    'X-Platform-User-Id': '38d068e1a2a982dd',
    'X-Application-User-Id': '886a0c2b-2f9a-4684-bc08-fad3ef9e07ae',
    'X-Encryption': 'on',
    'X-Encryption-Mode': '3',
    'X-Encryption-Compress': 'gzip',
    'X-Version-Hash': 'a1cc2c1daae49b01bd64c8d192f7d1f616e428fc',
    'X-App-Flag1': '2',
    'X-App-Flag2': '0',
    'X-App-Flag3': '22000000',
    'X-App-Flag4': '0',
    Host: 'theaterdays-zh.appspot.com',
    TE: 'identity',
    'User-Agent': 'BestHTTP',
  },
})

export class CaptureOperator extends Operator {
  wrappedFetch(url: string, data: any) {
    return promiseRetry(
      (retry, times) =>
        axios
          .post(url, data)
          .then(async res => {
            const json = await decRes(res.data)
            if (!!json.error) {
              throw new Error('token gg')
            }
            return json
          })
          .catch(async err => {
            if (err?.message === 'token gg' || err?.response?.status === 401) {
              this.logger.warn('土豆身份过期，重新登录')
              await this.login()
            } else {
              this.logger.warn(`抓包失败，重新尝试，尝试次数${times}`)
              await this.login()
            }
            return retry(err)
          }),
      {
        retries: 1,
      }
    )
  }

  // 抓取档线信息
  async getRanks(
    evtId: number,
    rkType: RankType,
    ranks: number[]
  ): Promise<IEvtRank> {
    const reqData = ranks.map(num =>
      createReq({
        method: ReqMethod.Ranking,
        id: `pickup${num}`,
        params: [
          {
            ranking_compare_type: 1,
            only_use_ranking_data: false,
            lounge_id: '',
            lounge_id_list: [],
            offset_rank: num,
            limit: 1,
            mst_event_id: evtId,
            ranking_type: rkType,
          },
        ],
      })
    )

    this.logger.info(`开始抓取详细档线数据，evtId: ${evtId}`)

    const res = await this.wrappedFetch(
      '/rpc/RankingService.GetRanking',
      encReq(reqData)
    )

    const scores: IEvtRank['scores'] = []
    for (const item of res) {
      const user = item.result.ranking_list[0]
      if (!user) {
        continue
      } else {
        scores.push({
          score: user.score,
          rank: user.rank,
          name: user.user_summary.name,
          icon: user.user_summary.favorite_card.resource_id,
        })
      }
    }
    return {
      count: res[0].result.summary_count,
      summaryTime: new Date(res[0].result.summary_date),
      scores,
    }
  }

  // 登录
  async login() {
    const res = await axios
      .post('/auth/AuthService.Login', loginData)
      .then(res => decRes(res.data))
      .then(res => {
        console.log(res)
        return res.result.token
      })
    axios.defaults.headers.Authorization = `Bearer ${res}`
    this.logger.info('登录成功')
    setAuth(res)
  }
}
