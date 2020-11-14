import { Context } from '@azure/functions'
import { maybe } from 'typescript-monads'
import { isDocument } from '@typegoose/typegoose'
import { Dict, evtCache } from './utils'
import { MLTDEvtModel, MLTDRankModel } from './database/defs'
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
   * 历史事件档线查询
   * @param evtName 事件名称（采用模糊匹配搜索）
   */
  async getHistoryBorderPoints(evtName: string | number) {
    const evtBase =
      typeof evtName === 'string'
        ? evtCache.fuzzySearch(evtName)
        : maybe(Dict.get(evtName))
    return evtBase.match({
      some: obj => {
        this.logger.info(`要查询的活动evtId为${obj.evtId}`)
        return obj.evtType > EvtType.ShowTime // 该活动有档线
          ? MLTDEvtModel.findByEvtId(obj.evtId)
              .then(evt => evt!.populate('latestRank').execPopulate())
              .then(evt =>
                // 确保latestRank存在
                isDocument(evt.latestRank) && !!evt.latestRank
                  ? evt
                  : this.db.fetchBorderPoints(evt.evtId)
              )
          : Promise.reject('该活动无档线！')
      },
      none: () => Promise.reject('未找到该活动！'),
    })
  }
}
