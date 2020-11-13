import Fuse from 'fuse.js'
import { maybe } from 'typescript-monads'

import { MLTDBase } from './types'

const fuse = new Fuse<MLTDBase>([], {
  keys: ['evtName', 'evtId'],
})

export const evtCache = {
  setFuse: (list: MLTDBase[]) => fuse.setCollection(list),
  fuzzySearch: (pattern: string) =>
    maybe(fuse.search(pattern)[0]).map(elm => elm.item),
  currentEvt: () =>
    Dict.get([...Dict.keys()].reduce((prev, now) => Math.max(now, prev), 0))!,
}

/**
 * evtId到baseEvt的映射
 */
export const Dict: Map<number, MLTDBase> = new Map()
