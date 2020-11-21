import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'
import { APIOperator } from '@lib/controller'
import { BorderPointsDiff } from '@lib/types'

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
    const current = await operator.fetchBorderPoints()
    // const api = new APIOperator(ctx)
    // const diff = await api.getLastFour(current.evtId)
    // ctx.bindings = {
    //   // omit some properties
    //   outputQueueItem: JSON.stringify(diff, (k, v) =>
    //     ['_id', '__v'].includes(k) ? undefined : v
    //   ),
    // }
  } catch (error) {
    // do nothing
  }
}

export default timerTrigger
