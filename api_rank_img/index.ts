import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { APIOperator } from '@lib/controller'
import { customErr } from '@lib/utils'

const httpTrigger: AzureFunction = async function (ctx: Context) {
  let { evtId } = ctx.bindingData
  // 0比较特殊，需要特判。。
  if (!!evtId.data) {
    evtId = 0
  }
  // 判断是数字还是字符串
  const keyword = !!parseInt(evtId) ? parseInt(evtId) : evtId
  return new APIOperator(ctx).getImg(keyword).then(
    res => ({
      body: res,
    }),
    err => customErr(err)
  )
}

export default httpTrigger
