import { Context } from '@azure/functions'
import { isDocument, DocumentType } from '@typegoose/typegoose'
import dayjs, { Dayjs } from 'dayjs'
import axios from 'axios'
import { Dict, evtCache } from './utils'
import { MLTDEvt, MLTDEvtModel, MLTDRank, MLTDRankModel } from './database/defs'
import { DBOperator } from './database'
import { BorderPointsDiff, EvtType, MLTDFull } from './types'
import { Operator } from './operator'
import { EVT_NOT_FOUND, NO_SUCH_TIME_IMG } from './errors'

const enum Interval {
  NOW = 0,
  HALF_HOUR = 30,
  ONE_HOUR = 60,
  ONE_AND_HALF_HOUR = 90,
  ONE_DAY = 60 * 24,
}

export const getLast = (interval: Interval, baseTime?: Date) => {
  if (!!baseTime) {
    return dayjs(baseTime).subtract(interval, 'minute')
  }
  const summary = dayjs()
  return summary
    .startOf('hour')
    .add(summary.minute() > 30 ? 30 : 0, 'minute')
    .subtract(interval, 'minute')
}
const BLOB_PREFIX =
  'https://storageaccountmltdz8de9.blob.core.windows.net/mltd-img'

export class APIOperator extends Operator {
  private db: DBOperator
  constructor(ctx: Context) {
    super(ctx)
    this.db = new DBOperator(ctx)
  }

  /**
   * 返回活动的最新的档线图片的地址
   */
  async getImg(evtName: string | number) {
    const evtBase = evtCache.findEvt(evtName)
    return evtBase.match({
      some: async obj => {
        const evt = (await MLTDEvtModel.findByEvtId(obj.evtId))!
        const actualTime =
          new Date().getTime() > evt.date.evtEnd.getTime()
            ? dayjs(evt.date.evtEnd).add(30, 'minute').add(1, 'second') // 历史活动
            : getLast(Interval.NOW) // 当前活动
        const fileName = actualTime.tz('UTC').format('YYYY-MM-DDTHH-mm[Z.png]')
        return axios.head(`${BLOB_PREFIX}/${fileName}`).then(
          () => `${BLOB_PREFIX}/${fileName}`,
          () => Promise.reject(NO_SUCH_TIME_IMG)
        )
      },
      none: () => Promise.reject(EVT_NOT_FOUND),
    })
  }

  /**
   * 获取活动的最后四次档线数据
   * @param evtId 活动id
   */
  async getLastFour(
    evtId: number,
    isFinal: boolean,
    baseTime: Date
  ): Promise<BorderPointsDiff> {
    return Promise.all(
      [
        Interval.NOW,
        isFinal ? Interval.ONE_HOUR : Interval.HALF_HOUR, // 最终档线的summaryTime在9点半，需要做个修正
        isFinal ? Interval.ONE_AND_HALF_HOUR : Interval.ONE_HOUR,
        Interval.ONE_DAY,
      ].map(inter => {
        return this.getBorderPoints(evtId, getLast(inter, baseTime).toDate())
      })
    ).then(res => ({
      current: res[0]!,
      lastHalf: res[1],
      lastHour: res[2],
      lastDay: res[3],
      isFinal,
    }))
  }

  /**
   * 活动档线查询
   * @param evtName 事件名称（采用模糊匹配搜索），若为0则为当前活动
   * @param summaryTime 指定的结算时间
   */
  async getBorderPoints(
    evtName: string | number,
    summaryTime?: Date
  ): Promise<MLTDFull | null> {
    const evtBase = evtCache.findEvt(evtName)
    return evtBase.match({
      some: async obj => {
        this.logger.info(`要查询的活动evtId为${obj.evtId}`)
        if (obj.evtType <= EvtType.ShowTime) {
          return Promise.reject('该活动无档线！')
        }
        let evt = (await MLTDEvtModel.findByEvtId(obj.evtId))!
        let rank: DocumentType<MLTDRank>
        // 指定档线
        if (summaryTime) {
          const _rank = await MLTDRankModel.findOne({
            parentEvt: evt._id,
            'eventPoint.summaryTime': summaryTime,
          })
          if (!_rank) {
            this.logger.warn(`无该时间的档线: ${summaryTime.toLocaleString()}`)
            return null
          }
          rank = _rank
        } else {
          // 未指定档线，即为最新档线
          evt = await evt
            .populate('latestRank')
            .execPopulate()
            .then(evt =>
              // 确保latestRank存在
              isDocument(evt.latestRank) && !!evt.latestRank
                ? evt
                : this.db.fetchBorderPoints(true, evt.evtId)
            )
          // 这里偷懒，不想写type guard了
          rank = (evt.latestRank as unknown) as DocumentType<MLTDRank>
        }
        return {
          ...rank.toObject(),
          ...evt.toObject(),
        }
      },
      none: () => Promise.reject(EVT_NOT_FOUND),
    })
  }
}
