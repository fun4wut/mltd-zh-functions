import { MLTDEvt, MLTDRank } from './database/defs'

export enum EvtType {
  Collection = 1,
  ShowTime,
  Tour,
  Traditional,
  Anniversary,
  MLWorking,
  AprilFool,
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

export type MLTDFull = MLTDRank & MLTDEvt

/**
 * 当前档线详情，包含前一小时和前一天的数据
 */
export interface BorderPointsDiff {
  current: MLTDFull
  lastHalf: MLTDFull | null
  lastHour: MLTDFull | null
  lastDay: MLTDFull | null
  isFinal: boolean
}
