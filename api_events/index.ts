import 'module-alias/register'
// to init db and evtCache
require('@lib/startup')
import { AzureFunction, Context } from '@azure/functions'
import { APIOperator } from '@lib/controller'
import { customErr, customJson } from '@lib/utils'

const httpTrigger: AzureFunction = function (ctx: Context) {
  const operator = new APIOperator(ctx)
  const { evtId } = ctx.bindingData

  const body: Promise<unknown> =
    evtId > 0
      ? operator.getHistoryBorderPoints(evtId)
      : operator.getCurrentBorderPoints()

  return body.then(
    res => customJson(res, ['parentEvt']),
    err => customErr(err)
  )
}

export default httpTrigger
