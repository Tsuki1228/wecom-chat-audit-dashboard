/**
 * API 契约类型（手写，依据 Spec §5 / §6 + UIUX §4）。
 * 不依赖 openapi 代码生成。统一响应信封：{ code, data, message }。
 */

/** 统一响应信封：错误码非 0。 */
export interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

/** 分页通用结构。 */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more?: boolean;
}

/** 登录请求 / 响应。 */
export interface LoginRequest {
  username: string;
  password: string;
}
export interface LoginResponse {
  token: string;
  user?: {
    username: string;
    display_name?: string;
    role?: string;
  };
}

/**
 * 会话分组枚举（Spec §6 room_type）：1 群(内部) / 2 单聊 / 3 外部群。
 * UIUX 侧边栏分组：客户群 / 内部群 / 外部群 / 单聊。
 * 前端按 room_type 映射展示分组标签（见 lib/group.ts）。
 */
export type RoomType = 1 | 2 | 3;

/** 群聊 / 会话列表项。 */
export interface Room {
  roomid: string;
  room_name: string;
  room_type: RoomType;
  member_count: number;
  last_msg_time: number; // BIGINT ms（企业微信 msg_time 格式）
  last_msg?: string; // 末条摘要（纯文本预览）
  last_msg_type?: MsgType;
  unread?: number;
}

/** 会话详情：成员信息 + 基本信息。 */
export interface RoomDetail {
  roomid: string;
  room_name: string;
  room_type: RoomType;
  member_count: number;
  members: Member[];
  /** 时间范围（ms）。 */
  start_time?: number;
  end_time?: number;
}

/** 成员类型（Spec §6 chat_members.user_type）。 */
export type MemberType = 1 | 2 | 3; // 1 员工 / 2 外部联系人 / 3 机器人

export interface Member {
  user_id: string;
  user_type: MemberType;
  display_name: string;
  corp_name?: string; // 外部联系人公司名
  avatar_path?: string;
}

/** 消息发送者类型（Spec §6 chat_messages.sender_type）。 */
export type SenderType = 1 | 2 | 3; // 1 员工(本端) / 2 外部联系人 / 3 机器人

/** 消息动作（Spec §6 action）。 */
export type MsgAction = 'send' | 'recall' | 'switch';

/** 消息类型（覆盖 UIUX §4 渲染规范）。 */
export type MsgType =
  | 'text'
  | 'image'
  | 'voice'
  | 'video'
  | 'file'
  | 'link'
  | 'card'
  | 'redpacket'
  | 'location'
  | 'sys';

/** 各消息类型 content 负载（content JSON）。 */
export interface TextContent {
  text: string;
}
export interface ImageContent {
  url?: string;
  thumb?: string;
  w?: number;
  h?: number;
  size?: number;
}
export interface VoiceContent {
  url?: string;
  media_path?: string;
  duration: number; // 秒
  size?: number;
}
export interface VideoContent {
  url?: string;
  cover?: string;
  duration?: number;
  size?: number;
}
export interface FileContent {
  name: string;
  size: number; // 字节
  url?: string;
  media_path?: string;
  ext?: string;
}
export interface LinkContent {
  title: string;
  url: string;
  desc?: string;
  domain?: string;
  thumb?: string;
}
export interface CardContent {
  name: string;
  corp?: string;
  title?: string;
  avatar?: string;
}
export interface RedPacketContent {
  status: 'unopened' | 'opened';
  amount?: string;
  msg?: string;
}
export interface LocationContent {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}
export interface SysContent {
  text: string;
}

/** 单条消息（Spec §6 chat_messages）。 */
export interface Message {
  msgid: string;
  roomid: string;
  sender_id: string;
  sender_type: SenderType;
  sender_name?: string;
  receiver_ids?: string[];
  msg_type: MsgType;
  msg_time: number; // BIGINT ms
  msg_time_ts?: string; // UTC 字符串
  action: MsgAction;
  content:
    | TextContent
    | ImageContent
    | VoiceContent
    | VideoContent
    | FileContent
    | LinkContent
    | CardContent
    | RedPacketContent
    | LocationContent
    | SysContent
    | Record<string, unknown>;
  media_path?: string;
}

/** 检索命中项（含会话上下文，便于点击跳转）。 */
export interface SearchHit {
  msgid: string;
  roomid: string;
  room_name?: string;
  sender_id: string;
  sender_name?: string;
  sender_type: SenderType;
  msg_type: MsgType;
  msg_time: number;
  snippet: string; // 高亮前纯文本片段；高亮在服务端/前端基于 q 包裹
  matched?: boolean;
}

export interface SearchResponse {
  items: SearchHit[];
  total: number;
  q: string;
}

/** 检索 / 筛选条件（前端 -> /search）。 */
export interface SearchParams {
  q?: string;
  roomid?: string;
  sender_id?: string;
  sender_type?: SenderType;
  msg_type?: MsgType;
  start?: number; // ms
  end?: number; // ms
  page?: number;
  limit?: number;
}

export interface HealthResponse {
  status: string;
  puller?: string;
}

/** 业务错误（统一抛出）。 */
export class ApiError extends Error {
  code: number;
  status?: number;
  constructor(message: string, code = -1, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}
