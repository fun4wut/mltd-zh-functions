import _axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import promiseRetry from 'promise-retry'
import fs from 'fs'

import { decRes, encReq } from './magic'
import { createReq, RankType, ReqMethod } from './defs'
import { IEvtRank } from '../types'
import { Operator } from '../operator'

const BaseUrl = 'https://theaterdays-zh.appspot.com'
// login用的body，因为不需要动，所以直接传上去就行
const loginData = `wp7_RNHLxP6m2KeusXpBZOVSUz9JN9UfAusjMGDLMT33I_0MteyeK_3rKoqqYz3wud-kXxHiXHO79KXVq4lrTFN109aEVmgg9GUdIm-lBwOkNOMHiSRoWYn7CCAp4dUmkHZCznFCOhrFqG741ck_3aG897t-hpVnOnEC-Y6ShZUIYYmnncBmI5EZW3ZzVL-q-CtQpsfYBVY9s1c1Y-_bajFXaJoBiUR3sDZeIn5FzEScjTFooPxUssgSv83ern6SDdjyfRUUaqYugU8X2aggKKp8kasuNs5AkFxtWvJRywuUwL56XnBYsgQMSBovLh6Q9cfU7mvRI2DeRyN-XTeyKXtHCLgKyzqXwcpxBaWRVgax50WZhBkxZCCEnXQP8z0Wk6RN2o8vUSVjWtt9Q-KF0uRa7ZVkmdXebRm_6QyRx1JW6NoY6vfw0e5z6nS9PCxf`

const cachePath = './.auth_cache'

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
    'X-Application-Version': '1.6.000',
    'X-Unity-Version': '2017.4.29f1',
    'X-Device-Time': '2020-11-08T12:43:04.703076+08:00',
    'X-Device-Name': 'OnePlus ONEPLUS A5000',
    'X-Os-Name': 'android',
    'X-Os-Version': '8.1.0',
    'X-Platform-User-Id': '38d068e1a2a982dd',
    'X-Application-User-Id': '886a0c2b-2f9a-4684-bc08-fad3ef9e07ae',
    'X-Encryption': 'on',
    'X-Encryption-Mode': '3',
    'X-Encryption-Compress': 'gzip',
    'X-Version-Hash': '0c06420a073cf075da4b122f13ebaaad3383db3c',
    'X-App-Flag1': '2',
    'X-App-Flag2': '0',
    'X-App-Flag3': '0',
    'X-App-Flag4': '44',
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
        retries: 3,
      }
    )
  }

  // 抓取档线信息
  async getRanks(evtId: number, rkType: RankType): Promise<IEvtRank> {
    const reqData = [1, 15, 250, 500, 1000, 2000].map(num =>
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
    return {
      count: res[0].result.summary_count,
      summaryTime: new Date(res[0].result.summary_date),
      scores: res.map(item => {
        const user = item.result.ranking_list[0]
        return {
          score: user.score,
          rank: user.rank,
          name: user.user_summary.name,
          icon: user.user_summary.favorite_card.resource_id,
        }
      }),
    }
  }

  // 登录
  async login() {
    const res = await axios
      .post('/auth/AuthService.Login', loginData)
      .then(res => decRes(res.data))
      .then(res => res.result.token)
    axios.defaults.headers.Authorization = `Bearer ${res}`
    this.logger.info('登录成功')
    setAuth(res)
  }
}
