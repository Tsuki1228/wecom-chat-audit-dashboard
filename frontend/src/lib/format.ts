import type { MsgType, RoomType, SenderType } from '../types/api';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 将 BIGINT ms 转为本地日期对象（防御 NaN / 0）。 */
export function toDate(ms?: number): Date | null {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms);
}

/** 时间线内气泡时间戳：HH:mm。 */
export function formatTime(ms?: number): string {
  const d = toDate(ms);
  if (!d) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 列表项 / 会话头时间：今天=HH:mm，昨天=昨天，年内=MM-DD，跨年=YYYY-MM-DD。 */
export function formatListTime(ms?: number): string {
  const d = toDate(ms);
  if (!d) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTime(ms);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return '昨天';
  if (d.getFullYear() === now.getFullYear()) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 日期分割线：YYYY-MM-DD 星期X。 */
export function formatDateDivider(ms?: number): string {
  const d = toDate(ms);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 星期${WEEK[d.getDay()]}`;
}

/** 会话头时间范围：YYYY-MM-DD。 */
export function formatDateShort(ms?: number): string {
  const d = toDate(ms);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 媒体元信息时间（含秒）：YYYY-MM-DD HH:mm:ss。 */
export function formatMetaTime(ms?: number): string {
  const d = toDate(ms);
  if (!d) return '';
  return `${formatDateShort(ms)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 文件大小：B / KB / MB（1024 进制），整数省略小数位。 */
export function formatBytes(bytes?: number): string {
  if (bytes == null || bytes < 0) return '';
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${fmt(kb)} KB`;
  const mb = kb / 1024;
  return `${fmt(mb)} MB`;
}

/** 语音 / 视频时长：mm:ss。 */
export function formatDuration(sec?: number): string {
  if (sec == null || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${pad(s)}`;
}

/** 分组标签（UIUX 侧边栏分组：客户群 / 内部群 / 外部群 / 单聊）。 */
export function roomGroupLabel(roomType: RoomType): string {
  switch (roomType) {
    case 1:
      return '内部群';
    case 2:
      return '单聊';
    case 3:
      return '客户群'; // 外部群统一归类为「客户群」（外部联系人所在群）
    default:
      return '其他';
  }
}

/** 分组展示顺序。 */
export const ROOM_GROUP_ORDER = ['客户群', '内部群', '单聊'] as const;

export function isExternalSender(t: SenderType): boolean {
  return t === 2;
}
export function isBotSender(t: SenderType): boolean {
  return t === 3;
}
export function isOwnSender(t: SenderType): boolean {
  // 本端员工（被存档人）→ 右侧绿气泡
  return t === 1;
}

/** 消息类型中文名（检索 / 筛选展示）。 */
export const MSG_TYPE_LABEL: Record<MsgType, string> = {
  text: '文本',
  image: '图片',
  voice: '语音',
  video: '视频',
  file: '文件',
  link: '链接',
  card: '名片',
  redpacket: '红包',
  location: '位置',
  sys: '系统',
};

/** 安全分割文本为命中片段（用于关键词高亮，避免 dangerouslySetInnerHTML）。 */
export interface Segment {
  text: string;
  hit: boolean;
}
export function highlightSegments(text: string, query?: string): Segment[] {
  const q = (query ?? '').trim();
  if (!q) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) {
      parts.push({ text: text.slice(i), hit: false });
      break;
    }
    if (idx > i) parts.push({ text: text.slice(i, idx), hit: false });
    parts.push({ text: text.slice(idx, idx + q.length), hit: true });
    i = idx + q.length;
  }
  return parts;
}

/** 转义 HTML 实体（用于安全展示，避免 XSS）。 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
