import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'
import { customErr, customJson } from '@lib/utils'
import { APIOperator } from '@lib/controller'
import { genPic } from '@lib/pic-gen'

const httpTrigger: AzureFunction = async function (ctx: Context) {
  const { evtId } = ctx.bindingData
  return new DBOperator(ctx)
    .fetchBorderPoints(evtId > 0 ? evtId : undefined)
    .then(
      async res => {
        const api = new APIOperator(ctx)
        const diff = await api.getLastFour(res.evtId)
        await genPic(diff)
        return customJson('update OK')
      },
      err => customErr(err)
    )
}

export default httpTrigger
