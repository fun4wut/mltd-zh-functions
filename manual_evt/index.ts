import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'
import { customErr, customJson } from '@lib/utils'

const httpTrigger: AzureFunction = async function (context: Context) {
  return new DBOperator(context).fetchAllEvents().then(
    () => customJson('updateOk'),
    err => customErr(err)
  )
}

export default httpTrigger
