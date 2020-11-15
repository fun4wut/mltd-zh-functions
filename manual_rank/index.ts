import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'
import { customErr, customJson } from '@lib/utils'

const httpTrigger: AzureFunction = async function (ctx: Context) {
  const { evtId } = ctx.bindingData
  return new DBOperator(ctx)
    .fetchBorderPoints(evtId > 0 ? evtId : undefined)
    .then(
      () => customJson('update OK'),
      err => customErr(err)
    )
}

export default httpTrigger
