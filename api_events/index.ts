import 'module-alias/register'
// to init db and evtCache
require('@lib/startup')
import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { APIOperator } from '@lib/controller'
import { customErr, customJson } from '@lib/utils'
import { maybe } from 'typescript-monads'

const httpTrigger: AzureFunction = function (ctx: Context, req: HttpRequest) {
  const summary = maybe(req.query.summaryTime).match({
    some: time => new Date(time),
    none: () => undefined,
  })
  const operator = new APIOperator(ctx)
  let { evtId } = ctx.bindingData
  // 0比较特殊，需要特判。。
  if (!!evtId.data) {
    evtId = 0
  }
  // 判断是数字还是字符串
  const keyword = !!parseInt(evtId) ? parseInt(evtId) : evtId
  return operator.getBorderPoints(keyword, summary).then(
    res => customJson(res, ['parentEvt', 'latestRank']),
    err => customErr(err)
  )
}

export default httpTrigger
