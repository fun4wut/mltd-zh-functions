import Fuse from 'fuse.js'
import { maybe } from 'typescript-monads'
import { s2t } from 'chinese-s2t'

import { MLTDEvt, MLTDRank } from './database/defs'
import { IEvtBase } from './types'
import { isDocument } from '@typegoose/typegoose'

const fuse = new Fuse<IEvtBase>([], {
  keys: ['evtName', 'evtId'],
})

export const touchFish = [1, 2, 6]

export const evtCache = {
  setFuse: (list: IEvtBase[]) => fuse.setCollection(list),
  fuzzySearch: (pattern: string) =>
    maybe(fuse.search(s2t(pattern))[0]).map(elm => elm.item),
  currentEvt: () => {
    return Dict.get(
      [...Dict.entries()].reduce(
        (prev, now) =>
          touchFish.includes(now[1].evtType) ? prev : Math.max(now[0], prev),
        0
      )
    )!
  },
  findEvt(evtName: string | number) {
    return typeof evtName === 'string'
      ? evtCache.fuzzySearch(evtName)
      : maybe(evtName === 0 ? evtCache.currentEvt() : Dict.get(evtName))
  },
}

export const isFinalRanking = (evt: MLTDEvt) =>
  isDocument(evt.latestRank) &&
  evt.latestRank.eventPoint.summaryTime.getTime() ===
    evt.date.evtEnd.getTime() + 1801 * 1000 // 半小时加一秒

/**
 * evtId到baseEvt的映射
 */
export const Dict: Map<number, IEvtBase> = new Map()

/**
 * 构造azure function的result
 * @param obj 要序列化的数据
 * @param omit 省略的字段
 */
export const customJson = (
  obj: unknown,
  omit?: (keyof MLTDRank | keyof MLTDEvt)[]
) => ({
  body: JSON.stringify(obj, (k, v) =>
    ['_id', '__v', ...(omit ?? [])].includes(k) ? undefined : v
  ),
  headers: {
    'Content-Type': 'application/json',
  },
})

export const customErr = (msg: string) => ({
  body: {
    error: {
      status: 404,
      message: msg.toString(),
    },
  },
})
