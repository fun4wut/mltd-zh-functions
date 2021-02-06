import template from 'art-template'
import zipWith from 'lodash.zipwith'
import { Context } from '@azure/functions'
import dayjs from 'dayjs'
import { resolve } from 'path'
import { BorderPointsDiff } from '@lib/types'
import { Operator } from '@lib/operator'
import fs from 'fs'

const getDelta = (cur: { score: number }, base?: { score: number | null }) =>
  base?.score ? (cur.score - base.score).toLocaleString() : '-'

// minify HTML page size
template.defaults.minimize = true

export class HTMLOperator extends Operator {
  constructor(ctx: Context) {
    super(ctx)
    this.logger.info(`TimeZone is ${dayjs.tz.guess()}`)
  }

  reOrganize(diff: BorderPointsDiff, key: 'eventPoint' | 'highScore') {
    const arrObj = zipWith(
      diff.current[key].scores,
      diff.lastHalf?.[key]?.scores ?? [],
      diff.lastHour?.[key]?.scores ?? [],
      diff.lastDay?.[key]?.scores ?? [],
      (cur, la, lb, lc) => {
        if (!cur) {
          return null
        }
        return {
          rank: cur?.rank,
          name: cur.name,
          icon: `https://storage.matsurihi.me/mltd_zh/icon_l/${cur.icon}_1.png`,
          current: cur.score.toLocaleString(),
          last30min: getDelta(cur, la),
          last60min: getDelta(cur, lb),
          last24h: getDelta(cur, lc),
        }
      }
    ).filter(Boolean)
    return arrObj
  }

  genHTML(diff: BorderPointsDiff) {
    try {
      const html: string = template(
        resolve(__dirname, '../../../lib/html-gen/index.art'),
        {
          summaryTime: diff.isFinal
            ? '最终排名' // 最终排名不显示时间了，避免造成误解
            : dayjs(diff.current.eventPoint.summaryTime)
                .tz('Asia/Shanghai')
                .format('YYYY-MM-DD HH:mm'),
          evtName: diff.current.evtName,
          background: `https://storage.matsurihi.me/mltd/event_bg/${(
            diff.current.evtId + ''
          ).padStart(4, '0')}.png`,
          pt: this.reOrganize(diff, 'eventPoint'),
          highScore: this.reOrganize(diff, 'highScore'),
        }
      )
      this.logger.info('html gen done')
      if (process.env.NODE_ENV !== 'prod') {
        fs.writeFileSync('./index.html', html)
      }
      return html
    } catch (error) {
      this.logger.error(error)
    }
  }
}
