# [WIP] MLTD繁中服API补全计划

[Princess API](https://api.matsurihi.me/docs/) 很酷，但是缺少繁中服的档线查询，每次打活动还得跑到外网去看档线变化情况。本repo旨在对 `Princess API` 中的档线查询进行补充，并进行一定的精简。

> 因为涉及对游戏的抓包，所以密钥等关键信息未给出，有关如何抓包可以参考这篇博客：https://estertion.win/2019/08/mltd%e7%b9%81%e4%b8%ad%e6%9c%8d-api%e9%80%9f%e8%a7%88/

*Deployed on Azure*

## API 一览

**PREFIX: https://mltd-function.azurewebsites.net/api**

1. 查询PT档线和高分档线（Rank 1, 15, 250, 500, 1000, 2000）
   API：`/events/{id}/rankings/borderPoints`
   
   参数：
   
   - 路径参数 `id`：如果为数字，即为活动的id，如果为字符串，则为活动名称（支持模糊查找），如果为0，即为当前活动。
   - 查询参数 `summaryTime`：指定档线的结算时间，请使用JS的 `new Date` 能够识别的字符串格式。
   
   返回：[原版](https://api.matsurihi.me/docs/#mltd-v1-events-rankings)的基础上增加了event本身的字段
   ```ts
   {
        //...
        evtId: number
        evtName: string
        evtType: EvtType
        date: {
            evtBegin: Date
            evtEnd: Date
            boostBegin: Date | null
            boostEnd: Date | null
        }
    }
   ```

## TODO-List

- [x]  抓到台服的包
- [x]  去重
- [x]  历史档线
- [x]  定时抓取
- [x]  自动重连
- [x]  Log
- [x]  档线涨幅（半小时、一天）
- [x]  mongo 数据库重构
    - [x]  date不再是ref
    - [x]  搬到Azure？500M太少了
- [ ]  dayjs替换Date
- [x]  github action
- [x]  获取档线可以指定summaryTime
- [ ]  给azure function上个好点的类型提示
- [ ]  ML涩图：抓取放到OSS中（Azure Blob Storage）
- [ ]  图片版
    - [ ]  头像资源获取（直接从网上抓吧）
    - [ ]  input绑定到cosmos，收到rank增加后，生成处理图片，放到Blob上
- [x]  简繁转换
- [x]  函数抽离
- [ ]  GraphQL替代Restful
- [ ]  与日服档线对比

## 其他

在 `host.json` 上使用 `extensionBundle` 会导致环境起的很慢（网络问题），这里直接本地安装 `extension`

```bash
func extensions install --package Microsoft.Azure.WebJobs.Extensions.Storage --version 4.0.2
```