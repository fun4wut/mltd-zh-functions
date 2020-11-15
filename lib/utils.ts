import Fuse from 'fuse.js'
import { maybe } from 'typescript-monads'
import { MLTDEvt, MLTDRank } from './database/defs'

import { IEvtBase } from './types'

const fuse = new Fuse<IEvtBase>([], {
  keys: ['evtName', 'evtId'],
})

export const evtCache = {
  setFuse: (list: IEvtBase[]) => fuse.setCollection(list),
  fuzzySearch: (pattern: string) =>
    maybe(fuse.search(pattern)[0]).map(elm => elm.item),
  currentEvt: () =>
    Dict.get([...Dict.keys()].reduce((prev, now) => Math.max(now, prev), 0))!,
}

/**
 * evtId到baseEvt的映射
 */
export const Dict: Map<number, IEvtBase> = new Map()

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
