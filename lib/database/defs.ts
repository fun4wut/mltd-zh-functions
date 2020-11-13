import {
  getModelForClass,
  modelOptions,
  prop,
  Ref,
  ReturnModelType,
  Severity,
} from '@typegoose/typegoose'
import { MLTDBase, EvtType, Rank } from '../types'

export class MLTDEvt implements MLTDBase {
  @prop({ index: true })
  public evtId!: number

  @prop()
  public evtName!: string

  @prop({ enum: EvtType })
  public evtType!: EvtType

  @prop({ ref: () => MLTDDate })
  public date: Ref<MLTDDate>

  // 指向最新的rank记录
  @prop({ ref: () => MLTDRank })
  public latestRank?: Ref<MLTDRank | null>

  public static findByEvtId(
    this: ReturnModelType<typeof MLTDEvt>,
    evtId: number
  ) {
    return this.findOne({ evtId }).exec()
  }
}

export class MLTDDate {
  @prop()
  public evtBegin!: Date

  @prop()
  public evtEnd!: Date

  @prop()
  public boostBegin?: Date | null

  @prop()
  public boostEnd?: Date | null
}

@modelOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class MLTDRank {
  @prop({ ref: () => MLTDEvt })
  public parentEvt!: MLTDEvt

  @prop()
  public eventPoint!: Rank

  @prop()
  public highScore!: Rank

  // 休息室台服暂时没有
}

export const MLTDEvtModel = getModelForClass(MLTDEvt)

export const MLTDDateModel = getModelForClass(MLTDDate)

export const MLTDRankModel = getModelForClass(MLTDRank)
