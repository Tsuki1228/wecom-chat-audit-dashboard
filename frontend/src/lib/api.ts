import { request } from './http';
import type {
  HealthResponse,
  Member,
  Message,
  Page,
  Room,
  RoomDetail,
  SearchParams,
  SearchResponse,
  SearchHit,
} from '../types/api';

/** 健康探测。 */
export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

/** 会话列表（分页 + 关键词过滤）。 */
export function fetchRooms(params: { page?: number; limit?: number; keyword?: string } = {}): Promise<
  Page<Room>
> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.keyword) qs.set('keyword', params.keyword);
  return request<Page<Room>>(`/rooms?${qs.toString()}`);
}

/** 会话详情（成员 + 基本信息）。 */
export function fetchRoomDetail(roomid: string): Promise<RoomDetail> {
  return request<RoomDetail>(`/rooms/${encodeURIComponent(roomid)}`);
}

/** 消息时间线（分页）。 */
export function fetchMessages(params: {
  roomid: string;
  page?: number;
  limit?: number;
  before_msg_time?: number;
}): Promise<Page<Message>> {
  const qs = new URLSearchParams();
  qs.set('roomid', params.roomid);
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.before_msg_time != null) qs.set('before_msg_time', String(params.before_msg_time));
  return request<Page<Message>>(`/messages?${qs.toString()}`);
}

/** 单条消息详情。 */
export function fetchMessage(msgid: string): Promise<Message> {
  return request<Message>(`/messages/${encodeURIComponent(msgid)}`);
}

/** 全文 / 条件检索。 */
export function searchMessages(params: SearchParams = {}): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  const set = (k: string, v?: string | number) => {
    if (v != null && v !== '') qs.set(k, String(v));
  };
  set('q', params.q);
  set('roomid', params.roomid);
  set('sender_id', params.sender_id);
  set('sender_type', params.sender_type);
  set('msg_type', params.msg_type);
  set('start', params.start);
  set('end', params.end);
  set('page', params.page);
  set('limit', params.limit);
  return request<SearchResponse>(`/search?${qs.toString()}`);
}

/** 成员列表（员工 / 外部联系人）。 */
export function fetchMembers(params: { keyword?: string; user_type?: number } = {}): Promise<{
  items: Member[];
  total: number;
}> {
  const qs = new URLSearchParams();
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.user_type != null) qs.set('user_type', String(params.user_type));
  return request<{ items: Member[]; total: number }>(`/members?${qs.toString()}`);
}

export type { SearchHit };
