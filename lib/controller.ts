import { Context } from '@azure/functions'
import { maybe } from 'typescript-monads'
import { isDocument, DocumentType } from '@typegoose/typegoose'
import { Dict, evtCache } from './utils'
import { MLTDEvtModel, MLTDRank, MLTDRankModel } from './database/defs'
import { DBOperator } from './database'
import { BorderPointsDiff, EvtType } from './types'
import { Operator } from './operator'

const getLastHalf = (d: Date) => new Date(d.getTime() - 1000 * 1800)

const getLastHour = (d: Date) => new Date(d.getTime() - 1000 * 3600)

const getLastDay = (d: Date) => new Date(d.getTime() - 1000 * 3600 * 24)

export class APIOperator extends Operator {
  private db: DBOperator
  constructor(ctx: Context) {
    super(ctx)
    this.db = new DBOperator(ctx)
  }

  /**
   * 当前事件档线查询
   */
  async getCurrentBorderPoints(): Promise<BorderPointsDiff> {
    const evtBase = evtCache.currentEvt()
    if (evtBase.evtType <= EvtType.ShowTime) {
      return Promise.reject('该活动无档线！')
    }
    const evt = await MLTDEvtModel.findByEvtId(evtBase.evtId).then(evt =>
      evt!.populate('latestRank').execPopulate()
    )

    // 如果latestRank不存在，说明还没拉到档线
    if (!isDocument(evt.latestRank) || !evt.latestRank) {
      return Promise.reject('尚未获得该活动档线！')
    }
    const lastHalf = await MLTDRankModel.findOne({
      parentEvt: evt._id,
      'eventPoint.summaryTime': getLastHalf(
        evt.latestRank.eventPoint.summaryTime
      ),
    })
    const lastHour = await MLTDRankModel.findOne({
      parentEvt: evt._id,
      'eventPoint.summaryTime': getLastHour(
        evt.latestRank.eventPoint.summaryTime
      ),
    })
    const lastDay = await MLTDRankModel.findOne({
      parentEvt: evt._id,
      'eventPoint.summaryTime': getLastDay(
        evt.latestRank.eventPoint.summaryTime
      ),
    })
    return {
      current: evt,
      lastHalf,
      lastDay,
      lastHour,
    }
  }

  /**
   * 活动档线查询
   * @param evtName 事件名称（采用模糊匹配搜索），若为0则为当前活动
   * @param summaryTime 指定的结算时间
   */
  async getBorderPoints(evtName: string | number, summaryTime?: Date) {
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
            return Promise.reject('无该时间的档线')
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
