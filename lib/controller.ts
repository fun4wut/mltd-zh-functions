import { Context } from '@azure/functions'
import { maybe } from 'typescript-monads'
import { isDocument, DocumentType } from '@typegoose/typegoose'
import dayjs, { Dayjs } from 'dayjs'
import { Dict, evtCache } from './utils'
import { MLTDEvt, MLTDEvtModel, MLTDRank, MLTDRankModel } from './database/defs'
import { DBOperator } from './database'
import { BorderPointsDiff, EvtType } from './types'
import { Operator } from './operator'

const enum Interval {
  NOW = 0,
  HALF_HOUR = 30,
  ONE_HOUR = 60,
  ONE_DAY = 60 * 24,
}

export const getLast = (interval: Interval, baseTime?: Date) => {
  if (!!baseTime) {
    return dayjs(baseTime).subtract(interval, 'minute').toDate()
  }
  const summary = dayjs()
  return summary
    .startOf('hour')
    .add(summary.minute() > 30 ? 30 : 0, 'minute')
    .subtract(interval, 'minute')
    .toDate()
}

export class APIOperator extends Operator {
  private db: DBOperator
  constructor(ctx: Context) {
    super(ctx)
    this.db = new DBOperator(ctx)
  }

  /**
   * 获取活动的最后四次档线数据
   * @param evtId 活动id
   */
  async getLastFour(evtId: number, baseTime?: Date): Promise<BorderPointsDiff> {
    return Promise.all(
      [
        Interval.NOW,
        Interval.HALF_HOUR,
        Interval.ONE_HOUR,
        Interval.ONE_DAY,
      ].map(inter => {
        return this.getBorderPoints(evtId, getLast(inter, baseTime))
      })
    ).then(res => ({
      current: res[0],
      lastHalf: res[1],
      lastHour: res[2],
      lastDay: res[3],
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
  ): Promise<MLTDRank & MLTDEvt> {
    const evtBase =
      typeof evtName === 'string'
        ? evtCache.fuzzySearch(evtName)
        : maybe(evtName === 0 ? evtCache.currentEvt() : Dict.get(evtName))
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
            return Promise.reject(`无该时间的档线: ${summaryTime}`)
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
                : this.db.fetchBorderPoints(evt.evtId)
            )
          // 这里偷懒，不想写type guard了
          rank = (evt.latestRank as unknown) as DocumentType<MLTDRank>
        }
        return {
          ...rank.toObject(),
          ...evt.toObject(),
        }
      },
      none: () => Promise.reject('未找到该活动！'),
    })
  }
}
