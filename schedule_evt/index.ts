import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'

const timerTrigger: AzureFunction = async function (
  ctx: Context,
  myTimer: any
): Promise<void> {
  const timeStamp = new Date().toISOString()

  if (myTimer.isPastDue) {
    ctx.log('Timer function is running late!')
  }
  ctx.log('Timer trigger function ran!', timeStamp)
  const operator = new DBOperator(ctx)
  await operator.fetchAllEvents()
}

export default timerTrigger
