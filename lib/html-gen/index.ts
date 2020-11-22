import template from 'art-template'
import zipWith from 'lodash.zipwith'
import fs from 'fs'
import dayjs from 'dayjs'
import { resolve } from 'path'
import { BorderPointsDiff } from '@lib/types'
import { Operator } from '@lib/operator'

const getDelta = (cur: { score: number }, base?: { score: number | null }) =>
  base?.score ? (cur.score - base.score).toLocaleString() : '-'

// minify HTML page size
template.defaults.minimize = true

export class HTMLOperator extends Operator {
  genHTML(diff: BorderPointsDiff) {
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
    try {
      const html: string = template(
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
      this.logger.info('html gen done')
      return html
    } catch (error) {
      this.logger.error(error)
    }
  }
}
