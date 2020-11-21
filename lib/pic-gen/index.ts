import template from 'art-template'
import puppter from 'puppeteer'
import zipWith from 'lodash.zipwith'
import fs from 'fs'
import { resolve } from 'path'
import { BorderPointsDiff } from '@lib/types'

export async function genPic(diff: BorderPointsDiff) {
  const reOrganize = (key: 'eventPoint' | 'highScore') =>
    zipWith(
      diff.current[key].scores,
      diff.lastHalf?.[key].scores,
      diff.lastHour?.[key].scores,
      diff.lastDay?.[key].scores,
      (cur, la, lb, lc) => ({
        rank: cur.rank,
        name: cur.name,
        icon: `https://storage.matsurihi.me/mltd_zh/icon_l/${cur.icon}_1.png`,
        current: cur.score,
        last30min: la.score,
        last60min: lb.score,
        last24h: lc.score,
      })
    )
  const html = template('./lib/pic-gen/index.art', {
    summaryTime: diff.current.eventPoint.summaryTime,
    evtName: diff.current.evtName,
    evtId: diff.current.evtId,
    pt: reOrganize('eventPoint'),
    highScore: reOrganize('highScore'),
  })
  fs.writeFileSync('index.html', html)
  // const browser = await puppter.launch()
  // const page = await browser.newPage()
  // await page.setContent(html)
  // const root = await page.$('.root')
  // await root!.screenshot({
  //   path: resolve(__dirname, 'demo.png'),
  // })
}
