import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'
import { customErr, customJson, isFinalRanking } from '@lib/utils'
import { APIOperator } from '@lib/controller'
import { HTMLOperator } from '@lib/html-gen'
import { isDocument } from '@typegoose/typegoose'

const httpTrigger: AzureFunction = async function (ctx: Context) {
  const { evtId } = ctx.bindingData
  return new DBOperator(ctx)
    .fetchBorderPoints(true, evtId > 0 ? evtId : undefined)
    .then(
      async res => {
        const api = new APIOperator(ctx)
        if (!isDocument(res.latestRank)) {
          return
        }
        const diff = await api.getLastFour(
          res.evtId,
          isFinalRanking(res),
          res.latestRank.eventPoint.summaryTime
        )
        const html = new HTMLOperator(ctx).genHTML(diff)

        ctx.bindings.res = customJson('update OK')
        if (!!html) {
          ctx.bindings.outputQueueItem = JSON.stringify({
            src: html,
            time: diff.current.eventPoint.summaryTime.toISOString(),
          })
        }
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
