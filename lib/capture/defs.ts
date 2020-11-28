interface APIBase {
  jsonrpc?: '2.0'
  id?: string | null // 用于一次请求发送多个req，便于定位
}

interface RankReq extends APIBase {
  method: ReqMethod.Ranking
  params: [RankParam]
}

interface ScheduleReq extends APIBase {
  method: ReqMethod.ScheduleList
  params: [unknown]
}

export type MagicReq = RankReq | ScheduleReq

export enum RankType {
  Pts = 1,
  Score,
}

export enum ReqMethod {
  Ranking = 'RankingService.GetRanking', // 查档线
  ScheduleList = 'EventService.GetEventScheduleList', // 查活动安排
}

export interface RankParam {
  ranking_compare_type: 1 // 保存为1不动
  ranking_type: RankType
  mst_event_id: number // 事件id，可以使用PrincessAPI获得
  lounge_id: '' // 工会，咕了
  offset_rank: number // 要查询的排名
  limit: number // 查询多少位P（从offset_rank算起）
  lounge_id_list: []
  only_use_ranking_data: boolean // 是否只获取排名信息，设为false可以拿到各个P的详细信息
}

export function createReq(obj: MagicReq): Required<MagicReq> {
  return {
    jsonrpc: '2.0',
    id: 'default',
    ...obj,
  }
}
