import { useMemo, useState } from 'react';
import { Filter, Inbox, Lock } from 'lucide-react';
import { IconButton, EmptyState, ErrorState, Skeleton } from './common';
import { MessageItem } from './MessageItem';
import { MediaPreview } from './MediaPreview';
import type { MediaPayload } from './MessageContent';
import { useAsync } from '../hooks/useAsync';
import { fetchMessages, fetchRoomDetail } from '../lib/api';
import { formatDateDivider, formatDateShort } from '../lib/format';
import type { Message } from '../types/api';

/**
 * 聊天时间线视图（核心页）：会话头 sticky + 日期分割 + 气泡流（左白右绿、外部标签、撤回系统条）+ 底部只读条。
 * 覆盖 Loading / Empty / Error / Populated / Edge 五态。
 */
export function ChatTimeline({
  roomId,
  highlightQuery,
  onOpenFilter,
}: {
  roomId: string;
  highlightQuery?: string | null;
  onOpenFilter: () => void;
}) {
  const detail = useAsync(() => fetchRoomDetail(roomId), [roomId]);
  const messages = useAsync(() => fetchMessages({ roomid: roomId, limit: 300 }), [roomId]);
  const [media, setMedia] = useState<MediaPayload | null>(null);

  const reload = () => {
    detail.reload();
    messages.reload();
  };

  const list = useMemo(() => {
    const items = messages.data?.items ?? [];
    return [...items].sort((a, b) => a.msg_time - b.msg_time);
  }, [messages.data]);

  // 按天插入日期分割线
  const rows = useMemo(() => {
    const out: { type: 'divider' | 'msg'; key: string; msgTime?: number; message?: Message }[] = [];
    let lastDay = '';
    for (const m of list) {
      const d = new Date(m.msg_time);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dayKey !== lastDay) {
        out.push({ type: 'divider', key: `d-${dayKey}`, msgTime: m.msg_time });
        lastDay = dayKey;
      }
      out.push({ type: 'msg', key: m.msgid, message: m });
    }
    return out;
  }, [list]);

  const room = detail.data;
  const isGroup = room ? room.room_type !== 2 : true;
  const hasError = detail.error || messages.error;

  return (
    <div className="flex h-full flex-col">
      {/* 会话头 sticky */}
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <div className="min-w-0">
          <div className="truncate-1 text-md font-emphasize text-fg">{room?.room_name || '加载中…'}</div>
          <div className="text-xs text-meta">
            {room ? `成员 ${room.member_count}` : '—'}
            {room?.start_time && room?.end_time && (
              <>
                {' · '}
                {formatDateShort(room.start_time)} ~ {formatDateShort(room.end_time)}
              </>
            )}
          </div>
        </div>
        <div className="ml-auto">
          <IconButton label="搜索与筛选本会话" onClick={onOpenFilter}>
            <Filter size={20} />
          </IconButton>
        </div>
      </div>

      {/* 消息流 */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin py-3">
        {messages.loading && <TimelineSkeleton />}

        {!messages.loading && hasError && (
          <div className="p-4">
            <ErrorState error={messages.error || detail.error} onRetry={reload} compact />
          </div>
        )}

        {!messages.loading && !hasError && list.length === 0 && (
          <EmptyState
            icon={<Inbox size={48} />}
            title="该会话暂无已拉取的消息记录"
            description="可能尚未到数据拉取窗口，或该会话未被纳入存档范围。"
          />
        )}

        {!messages.loading &&
          !hasError &&
          rows.map((row) =>
            row.type === 'divider' ? (
              <div key={row.key} className="my-3 flex justify-center">
                <span className="rounded-pill bg-tag-recall-bg px-3 py-1 font-mono text-xs text-meta">
                  {formatDateDivider(row.msgTime)}
                </span>
              </div>
            ) : (
              <MessageItem
                key={row.key}
                message={row.message!}
                showSenderName={isGroup}
                highlightQuery={highlightQuery}
                onOpenMedia={setMedia}
              />
            ),
          )}
      </div>

      {/* 底部只读条 */}
      <div className="flex h-11 shrink-0 items-center justify-center gap-2 border-t border-border bg-surface text-sm text-meta">
        <Lock size={16} />
        会话存档为只读记录，不支持发送消息
      </div>

      {media && <MediaPreview media={media} onClose={() => setMedia(null)} />}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4 px-4 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={'flex items-end gap-2 ' + (i % 3 === 0 ? 'flex-row-reverse' : 'flex-row')}>
          <Skeleton className="h-9 w-9 rounded-pill" />
          <Skeleton className={'h-10 ' + (i % 3 === 0 ? 'w-40' : 'w-56') + ' rounded-bubble'} />
        </div>
      ))}
    </div>
  );
}
