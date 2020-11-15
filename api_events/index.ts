import 'module-alias/register'
// to init db and evtCache
require('@lib/startup')
import { AzureFunction, Context } from '@azure/functions'
import { APIOperator } from '@lib/controller'
import { customJson } from '@lib/utils'

const httpTrigger: AzureFunction = async function (ctx: Context) {
  const operator = new APIOperator(ctx)
  const { evtId } = ctx.bindingData

  let body: unknown
  if (evtId > 0) {
    // 历史查询
    body = await operator.getHistoryBorderPoints(evtId)
  } else {
    // 当前档线
    body = await operator.getCurrentBorderPoints()
  }
  return customJson(body, ['parentEvt'])
}

export default httpTrigger
