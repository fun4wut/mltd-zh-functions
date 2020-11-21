import { DocumentType } from '@typegoose/typegoose'
import { MLTDEvt, MLTDRank } from './database/defs'

export enum EvtType {
  Collection = 1,
  ShowTime,
  Tour,
  Traditional,
  Anniversary,
}

export interface IEvtBase {
  evtId: number
  evtName: string
  evtType: EvtType
}

export interface IEvtRank {
  scores: {
    rank: number
    score: number
    name: string | null
    icon: string | null
  }[]
  summaryTime: Date
  count: number
}

export interface IEvtDate {
  evtBegin: Date

  evtEnd: Date

  boostBegin: Date | null

  boostEnd: Date | null
}

/**
 * 当前档线详情，包含前一小时和前一天的数据
 */
export interface BorderPointsDiff {
  current: DocumentType<MLTDEvt>
  lastHalf: DocumentType<MLTDRank> | null
  lastHour: DocumentType<MLTDRank> | null
  lastDay: DocumentType<MLTDRank> | null
}
