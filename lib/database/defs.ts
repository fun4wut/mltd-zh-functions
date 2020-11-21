import {
  getModelForClass,
  modelOptions,
  prop,
  Ref,
  ReturnModelType,
  Severity,
} from '@typegoose/typegoose'
import { IEvtBase, EvtType, IEvtRank, IEvtDate } from '../types'

export class MLTDEvt implements IEvtBase {
  @prop({ index: true })
  public evtId!: number

  @prop()
  public evtName!: string

  @prop({ enum: EvtType })
  public evtType!: EvtType

  @prop()
  public date!: IEvtDate

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

@modelOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class MLTDRank {
  @prop({ ref: () => MLTDEvt })
  public parentEvt!: MLTDEvt

  @prop()
  public eventPoint!: IEvtRank

  @prop()
  public highScore!: IEvtRank
}

export const MLTDEvtModel = getModelForClass(MLTDEvt)

export const MLTDRankModel = getModelForClass(MLTDRank)
