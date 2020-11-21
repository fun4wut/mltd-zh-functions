import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'
import { APIOperator } from '@lib/controller'

const timerTrigger: AzureFunction = async function (
  ctx: Context,
  myTimer: any
): Promise<void> {
  const timeStamp = new Date().toLocaleString()

  if (myTimer.isPastDue) {
    ctx.log('Timer function is running late!')
  }
  ctx.log('Timer trigger function ran!', timeStamp)
  const operator = new DBOperator(ctx)
  try {
    await operator.fetchBorderPoints()
    // const api = new APIOperator(ctx)
    // const diff = await api.getCurrentBorderPoints()
    // ctx.bindings = {
    //   outputQueueItem: {},
    // }
  } catch (error) {
    // do nothing
  }
}

export default timerTrigger
