import template from 'art-template'
import puppter from 'puppeteer'
import zipWith from 'lodash.zipwith'
import fs from 'fs'
import dayjs from 'dayjs'
import { resolve } from 'path'
import { BorderPointsDiff } from '@lib/types'
import { Operator } from '@lib/operator'

const getDelta = (cur: { score: number }, base?: { score: number | null }) =>
  base?.score ? (cur.score - base.score).toLocaleString() : '-'

export class PicOperator extends Operator {
  async genPic(diff: BorderPointsDiff) {
    const reOrganize = (key: 'eventPoint' | 'highScore') =>
      zipWith(
        diff.current[key].scores,
        diff.lastHalf?.[key]?.scores ?? [],
        diff.lastHour?.[key]?.scores ?? [],
        diff.lastDay?.[key]?.scores ?? [],
        (cur, la, lb, lc) => {
          return {
            rank: cur.rank,
            name: cur.name,
            icon: `https://storage.matsurihi.me/mltd_zh/icon_l/${cur.icon}_1.png`,
            current: cur.score.toLocaleString(),
            last30min: getDelta(cur, la),
            last60min: getDelta(cur, lb),
            last24h: getDelta(cur, lc),
          }
        }
      )
    const html = template(
      resolve(__dirname, '../../../lib/pic-gen/index.art'),
      {
        summaryTime: dayjs(diff.current.eventPoint.summaryTime).format(
          'YYYY-MM-DD HH:mm'
        ),
        evtName: diff.current.evtName,
        background: `https://storage.matsurihi.me/mltd/event_bg/${(
          diff.current.evtId + ''
        ).padStart(4, '0')}.png`,
        pt: reOrganize('eventPoint'),
        highScore: reOrganize('highScore'),
      }
    )
    fs.writeFileSync('index.html', html)
    this.logger.info('html gen done')
    try {
      const browser = await puppter.launch({
        args:
          process.env.NODE_ENV === 'prod' ? [] : ['--proxy-server=winip:1080'],
      })
      const page = await browser.newPage()
      await page.setContent(html, {
        timeout: 5000,
        waitUntil: 'load',
      })
      const root = await page.$('.root')
      await root!.screenshot({
        path: 'demo.png',
      })
    } catch (error) {
      this.logger.error(error)
    }
  }
}
