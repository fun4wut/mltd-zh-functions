import 'module-alias/register'
// to init db and evtCache
require('@lib/startup')
import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { APIOperator } from '@lib/controller'
import { customErr, customJson } from '@lib/utils'
import { maybe } from 'typescript-monads'

const httpTrigger: AzureFunction = function (ctx: Context, req: HttpRequest) {
  const summary = maybe(req.query.summaryTime).match({
    some: time => new Date(decodeURIComponent(time)),
    none: () => undefined,
  })
  const operator = new APIOperator(ctx)
  const { evtId } = ctx.bindingData
  return operator.getBorderPoints(evtId, summary).then(
    res => customJson(res, ['parentEvt', 'latestRank']),
    err => customErr(err)
  )
}

export default httpTrigger
