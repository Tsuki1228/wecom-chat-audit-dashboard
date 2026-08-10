import { useMemo, useState, type RefObject } from 'react';
import { Inbox, Search, User, Users, X } from 'lucide-react';
import { Avatar, EmptyState, ErrorState, Skeleton, Tag } from './common';
import { useAsync } from '../hooks/useAsync';
import { fetchRooms } from '../lib/api';
import { formatListTime, roomGroupLabel, ROOM_GROUP_ORDER } from '../lib/format';
import type { Room } from '../types/api';
import { useRouter } from '../lib/router';

/**
 * 左侧群聊列表栏（宽 280px）：分组头 + 会话项（头像+群名+摘要+时间+类型角标）+ 顶部本地搜索框。
 * 覆盖 Loading（骨架）/ Empty / Error（重试）三态。
 */
export function ConversationsList({
  searchInputRef,
  activeRoomId,
}: {
  searchInputRef?: RefObject<HTMLInputElement>;
  activeRoomId: string | null;
}) {
  const { navigate } = useRouter();
  const [keyword, setKeyword] = useState('');
  const { data, loading, error, reload } = useAsync(() => fetchRooms({ limit: 200 }), []);

  const rooms = data?.items ?? [];

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return rooms;
    return rooms.filter((r) => r.room_name.toLowerCase().includes(kw));
  }, [rooms, keyword]);

  const grouped = useMemo(() => {
    const map = new Map<string, Room[]>();
    for (const r of filtered) {
      const g = roomGroupLabel(r.room_type);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    const ordered: { label: string; items: Room[] }[] = [];
    for (const label of ROOM_GROUP_ORDER) {
      if (map.has(label)) ordered.push({ label, items: map.get(label)! });
    }
    for (const [label, items] of map) {
      if (!ROOM_GROUP_ORDER.includes(label as (typeof ROOM_GROUP_ORDER)[number])) {
        ordered.push({ label, items });
      }
    }
    return ordered;
  }, [filtered]);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-surface">
      {/* 顶部搜索框（本地过滤群名） */}
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-md bg-bg px-3 py-2 ring-1 ring-border transition-colors duration-fast ease-standard focus-within:ring-accent">
          <Search size={16} className="text-muted" />
          <input
            ref={searchInputRef}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索群名 / 会话"
            aria-label="搜索会话"
            className="w-full bg-transparent text-sm text-fg placeholder:text-meta focus:outline-none"
          />
          {keyword && (
            <button
              type="button"
              aria-label="清除搜索"
              onClick={() => setKeyword('')}
              className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-meta transition-colors duration-fast ease-standard hover:bg-surface-warm hover:text-fg"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        {loading && <ListSkeleton />}

        {!loading && error && (
          <div className="p-4">
            <ErrorState error={error} onRetry={reload} compact />
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon={<Inbox size={48} />}
            title="暂无存档会话"
            description="请先在管理后台配置存档员工范围，系统将自动拉取并解密会话记录。"
            action={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-bg px-3 py-2 text-sm text-fg-2 ring-1 ring-border transition-colors duration-fast ease-standard hover:bg-surface-warm"
              >
                <User size={16} />
                查看配置指引
              </button>
            }
          />
        )}

        {!loading &&
          !error &&
          grouped.map((group) => (
            <div key={group.label} className="mb-1">
              <div className="px-4 py-2 text-xs font-emphasize tracking-meta text-muted">
                {group.label}
                <span className="ml-1 text-meta">{group.items.length}</span>
              </div>
              <ul>
                {group.items.map((room) => (
                  <ConversationItem
                    key={room.roomid}
                    room={room}
                    active={room.roomid === activeRoomId}
                    onSelect={() => navigate(`/room/${encodeURIComponent(room.roomid)}`)}
                  />
                ))}
              </ul>
            </div>
          ))}
      </div>
    </aside>
  );
}

function ConversationItem({
  room,
  active,
  onSelect,
}: {
  room: Room;
  active: boolean;
  onSelect: () => void;
}) {
  const isSingle = room.room_type === 2;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        className={
          'relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-warm ' +
          (active ? 'bg-tag-external-bg' : '')
        }
      >
        {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" aria-hidden />}
        <Avatar
          name={room.room_name}
          size={40}
          icon={isSingle ? <User size={20} /> : <Users size={20} />}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate-1 flex-1 text-md font-emphasize text-fg">{room.room_name}</span>
            <span className="shrink-0 font-mono text-xs text-meta">
              {formatListTime(room.last_msg_time)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="truncate-1 flex-1 text-sm text-muted">{room.last_msg || '暂无消息'}</span>
            {isSingle ? (
              <Tag variant="plain" className="shrink-0">
                <User size={12} className="mr-1" />
                单聊
              </Tag>
            ) : (
              <Tag variant="plain" className="shrink-0">
                <Users size={12} className="mr-1" />
                群
              </Tag>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="px-3 py-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-1 py-3">
          <Skeleton className="h-10 w-10 rounded-pill" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-3 w-2/3" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
