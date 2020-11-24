import { mongoose } from '@typegoose/typegoose'
import glob from 'glob'
import fs from 'fs'
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

  // const res = glob.sync(
  //   'node_modules/puppeteer/.local-chromium/linux-*/chrome-linux/chrome'
  // )
  // res.forEach(item => {
  //   if (fs.statSync(item).mode === 33279) return
  //   fs.chmodSync(item, '0777')
  // })

  console.log('init OK')
})()
