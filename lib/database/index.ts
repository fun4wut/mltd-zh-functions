import _axios from 'axios'
import promiseRetry from 'promise-retry'
import { HttpsProxyAgent } from 'https-proxy-agent'

import { CaptureOperator } from '../capture'
import { RankType } from '../capture/defs'
import { MLTDEvtModel, MLTDRankModel } from './defs'
import { evtCache, Dict } from '../utils'
import { EvtType, IEvtDate } from '../types'
import { Operator } from '../operator'
import { Context } from '@azure/functions'

const BaseUrl = 'https://api.matsurihi.me/mltd/v1/zh'

const HALF_HOUR = 1000 * 1800

const axios = _axios.create({
  baseURL: BaseUrl,
  proxy: false,
  httpsAgent:
    process.env.NODE_ENV === 'prod'
      ? undefined
      : new HttpsProxyAgent('http://winip:1080'),
})

export class DBOperator extends Operator {
  private capture: CaptureOperator
  constructor(ctx: Context) {
    super(ctx)
    this.capture = new CaptureOperator(ctx)
  }
  private wrappedFetch(url: string, params?: unknown) {
    return promiseRetry(
      (retry, times) =>
        axios
          .get(url, {
            params,
          })
          .catch(err => {
            this.logger.warn(`Princess API抓取失败，重试，尝试次数${times}`)
            return retry(err)
          }),
      {
        retries: 3,
      }
    )
  }

  private notLatest(d: Date, isHistory: boolean) {
    return !isHistory && new Date().getTime() - d.getTime() > HALF_HOUR
  }
  /**
   * 定期执行，获取最新档线，并保存至数据库
   */
  async fetchBorderPoints(_evtId?: number) {
    const evtId = _evtId ?? evtCache.currentEvt().evtId
    // evt必定存在
    const evt = (await MLTDEvtModel.findByEvtId(evtId))!
    // 非档线活动，不fetch
    if (evt.evtType <= EvtType.ShowTime) {
      return Promise.reject('not ranking event')
    }
    // 最终排名出现
    const finalTime = evt.date.evtEnd.getTime() + HALF_HOUR + 1000
    const [ptsRes, scoreRes] = await promiseRetry(
      (retry, times) =>
        Promise.all([
          this.capture.getRanks(evtId, RankType.Pts),
          this.capture.getRanks(evtId, RankType.Score),
        ])
          .then(rankRes =>
            this.notLatest(
              rankRes[0].summaryTime,
              !!_evtId || finalTime === rankRes[0].summaryTime.getTime()
            )
              ? Promise.reject('抓取的不是最新档线')
              : rankRes
          )
          .catch(err => {
            this.logger.warn(err)
            this.logger.warn(`未能抓取到最新档线，之后重试，尝试次数${times}`)
            return retry(err)
          }),
      {
        minTimeout: 1000 * 30, // 每30秒重新执行一次，直到成功为止
        retries: 2, // 最大尝试次数为3次
        factor: 1, // 等待时间保持不变
      }
    )
    // 检查这个档线是不是已经有了，避免重复
    const exists = await MLTDRankModel.exists({
      'eventPoint.summaryTime': ptsRes.summaryTime,
      parentEvt: evt._id,
    })
    if (exists) {
      this.logger.warn('发现重复的档线，不保存至数据库')
      // return Promise.reject('no newer')
      return evt.populate('latestRank').execPopulate()
    }
    const rk = await MLTDRankModel.create({
      eventPoint: ptsRes,
      highScore: scoreRes,
      parentEvt: evt._id,
    })
    evt.latestRank = rk
    await evt.save()
    this.logger.info('档线更新成功')
    return evt
  }

  /**
   * 从Princess API抓取活动列表
   */
  async fetchAllEvents() {
    const data: any[] = await this.wrappedFetch('/events').then(res => res.data)

    const tasks = data.map(async item => {
      // 设置 Dict
      Dict.set(item.id, {
        evtId: item.id,
        evtName: item.name,
        evtType: item.type,
      })
      const curr = await MLTDEvtModel.findByEvtId(item.id)
      // 如果该evt已存在，就可以跳过了
      if (!!curr) {
        return
      }
      const date: IEvtDate = {
        evtBegin: new Date(item.schedule.beginDate),
        evtEnd: new Date(item.schedule.endDate),
        // 摸鱼活动没有加速
        boostBegin:
          item.type > 2 ? new Date(item.schedule.boostBeginDate) : null,
        boostEnd: item.type > 2 ? new Date(item.schedule.boostEndDate) : null,
      }
      await MLTDEvtModel.create({
        evtId: item.id,
        evtName: item.name,
        evtType: item.type,
        date,
      })
    })

    await Promise.all(tasks)
    this.logger.info('基本数据更新成功')
    evtCache.setFuse([...Dict.values()])
  }

  /**
   * 获取所有活动基本资料，入库。
   * 这个不受cache影响，定期运行
   */
  async clearAll() {
    this.logger.warn('开始清空数据库')
    const models: any[] = [MLTDRankModel, MLTDEvtModel]
    Promise.all(models.map(mod => mod.deleteMany({})))
  }
}
