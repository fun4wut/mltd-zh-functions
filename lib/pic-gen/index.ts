import template from 'art-template'
import puppter from 'puppeteer'
import { resolve } from 'path'

export async function genPic() {
  const html = template(resolve(__dirname, './index.art'), {
    summaryTime: new Date(),
    evtName: '白金星光剧场~最后的女演员~',
    pt: [
      {
        rank: 1,
        name: '番茄瓜皮',
        icon: 'https://storage.matsurihi.me/mltd_zh/icon_l/002chi0144_1.png',
        current: '10,380,554',
        last30min: '+79,510',
        last60min: '+160,369',
        last24h: '+4,033,583',
      },
    ],
    highScore: {},
  })
  const browser = await puppter.launch()
  const page = await browser.newPage()
  await page.setContent(html)
  const root = await page.$('.root')
  await root!.screenshot({
    path: resolve(__dirname, 'demo.png'),
  })
}
