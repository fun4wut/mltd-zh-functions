import 'module-alias/register'
import { AzureFunction, Context } from '@azure/functions'
import { DBOperator } from '@lib/database'
import { APIOperator } from '@lib/controller'
import { HTMLOperator } from '@lib/html-gen'

const timerTrigger: AzureFunction = async function (
  ctx: Context,
  myTimer: any
): Promise<void> {
  const timeStamp = new Date().toLocaleString()

  if (myTimer.isPastDue) {
    ctx.log('Timer function is running late!')
  }
  ctx.log('Timer trigger function ran!', timeStamp)
  await new DBOperator(ctx).fetchBorderPoints().then(
    async res => {
      const api = new APIOperator(ctx)
      const diff = await api.getLastFour(res.evtId)
      const html = new HTMLOperator(ctx).genHTML(diff)
      if (!!html) {
        ctx.bindings.outputQueueItem = JSON.stringify({
          src: html,
          time: diff.current.eventPoint.summaryTime.toISOString(),
        })
      }
    },
    err => ({
      err: ctx.log.error(err),
    })
  )
}

export default timerTrigger
