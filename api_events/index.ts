import 'module-alias/register'
// to init db and evtCache
require('@lib/startup')
import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { DBOperator } from '@lib/database'

const httpTrigger: AzureFunction = async function (
  ctx: Context,
  req: HttpRequest
) {
  ctx.log('HTTP trigger function processed a request.')
  // const evtId = ctx.bindingData.id
  // const operator = new DBOperator(ctx)
  ctx.res = {
    // status: 200, /* Defaults to 200 */
    body: '',
  }
}

export default httpTrigger
