import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'

const httpTrigger: AzureFunction = async function (ctx: Context) {
  const { evtId } = ctx.bindingData
  await new DBOperator(ctx).fetchBorderPoints(evtId > 0 ? evtId : undefined)
  ctx.res = {
    // status: 200, /* Defaults to 200 */
    body: 'update OK',
  }
}

export default httpTrigger
