import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'
import { customErr, customJson } from '@lib/utils'
import { APIOperator } from '@lib/controller'
import { PicOperator } from '@lib/pic-gen'

const httpTrigger: AzureFunction = async function (ctx: Context) {
  const { evtId } = ctx.bindingData
  return new DBOperator(ctx)
    .fetchBorderPoints(evtId > 0 ? evtId : undefined)
    .then(
      async res => {
        const api = new APIOperator(ctx)
        const diff = await api.getLastFour(res.evtId)
        const buffer = await new PicOperator(ctx).genPic(diff)
        ctx.bindings.res = customJson('update OK')
        ctx.bindings.outputBlob = buffer
        // 使用return，blob ouput不起作用
        // see https://github.com/Azure/azure-functions-nodejs-worker/issues/232
        // return {
        //   res: customJson('update OK'),
        //   ouputBlob: buffer,
        // }
      },
      err => ({
        res: customErr(err),
      })
    )
}

export default httpTrigger
