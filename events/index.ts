import { AzureFunction, Context, HttpRequest } from '@azure/functions'

// to init db and evtCache
require('../lib/startup')

const httpTrigger: AzureFunction = async function (
  ctx: Context,
  req: HttpRequest
): Promise<unknown> {
  ctx.log('HTTP trigger function processed a request.')
  const name = req.query.name || (req.body && req.body.name)
  const responseMessage = name
    ? 'Hello, ' + name + '. This HTTP triggered function executed successfully.'
    : 'This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.'

  return {
    // status: 200, /* Defaults to 200 */
    body: responseMessage,
  }
}

export default httpTrigger
