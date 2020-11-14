import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'

const httpTrigger: AzureFunction = async function (context: Context) {
  await new DBOperator(context).fetchAllEvents()
  context.res = {
    // status: 200, /* Defaults to 200 */
    body: 'update OK',
  }
}

export default httpTrigger
