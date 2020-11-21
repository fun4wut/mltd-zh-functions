import { AzureFunction, Context } from '@azure/functions'
import { genPic } from '@lib/pic-gen'

const queueTrigger: AzureFunction = async function (
  context: Context,
  myQueueItem: string
): Promise<void> {
  context.log('Queue trigger function processed work item')
  await genPic(JSON.parse(myQueueItem))
}

export default queueTrigger
