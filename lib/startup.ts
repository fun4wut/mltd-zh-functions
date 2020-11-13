import { mongoose } from '@typegoose/typegoose'
import { MLTDEvtModel } from './database/defs'
import { Dict, evtCache } from './utils'

// Function必须的初始化，只需初始化一次即可
;(async function init() {
  await mongoose // init mongodb
    .connect(process.env.DB_URI!, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
  await MLTDEvtModel.find().then(evts =>
    evts.forEach(evt =>
      Dict.set(evt.evtId, {
        evtId: evt.evtId,
        evtName: evt.evtName,
        evtType: evt.evtType,
      })
    )
  )
  evtCache.setFuse([...Dict.values()])
})()
