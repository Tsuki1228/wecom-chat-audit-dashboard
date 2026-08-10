import { useState } from 'react';
import { FileText, Filter, Image as ImageIcon, Link as LinkIcon, Mic, Search, Type, Video, X } from 'lucide-react';
import { IconButton } from './common';
import { useAsync } from '../hooks/useAsync';
import { fetchRooms, searchMessages } from '../lib/api';
import { MSG_TYPE_LABEL } from '../lib/format';
import type { MsgType, SenderType } from '../types/api';
import type { AppliedFilter } from './AppShell';

const TYPE_ICONS: Record<MsgType, React.ReactNode> = {
  text: <Type size={16} />,
  image: <ImageIcon size={16} />,
  voice: <Mic size={16} />,
  video: <Video size={16} />,
  file: <FileText size={16} />,
  link: <LinkIcon size={16} />,
  card: <Type size={16} />,
  redpacket: <Type size={16} />,
  location: <Type size={16} />,
  sys: <Type size={16} />,
};
const FILTER_TYPES: MsgType[] = ['text', 'image', 'voice', 'video', 'file', 'link'];

/**
 * 搜索与筛选面板（右侧抽屉，宽 360px）：关键词 / 范围 / 发送者分段 / 类型 Chip / 时间范围 / 应用·重置。
 * 应用 → 调用 /search 取命中数，回传父级用于时间线高亮 + 顶栏计数。
 */
export function SearchFilterPanel({
  open,
  onClose,
  onApply,
  currentRoomId,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (f: AppliedFilter) => void;
  currentRoomId: string | null;
}) {
  const [q, setQ] = useState('');
  const [senderType, setSenderType] = useState<SenderType | null>(null);
  const [types, setTypes] = useState<Set<MsgType>>(new Set());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [scope, setScope] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [hint, setHint] = useState('');

  const rooms = useAsync(() => fetchRooms({ limit: 200 }), []);

  if (!open) return null;

  const toggleType = (t: MsgType) => {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const reset = () => {
    setQ('');
    setSenderType(null);
    setTypes(new Set());
    setStart('');
    setEnd('');
    setScope([]);
    setHint('');
  };

  const apply = async () => {
    setApplying(true);
    setHint('');
    // 范围：后端 /search 仅支持单 roomid；多选时回退为全部会话并提示（透明，不静默）
    let roomid: string | undefined;
    let scopeHint = '';
    if (scope.length === 1) roomid = scope[0];
    else if (scope.length > 1) scopeHint = '多选范围后端暂仅支持单群，已按「全部会话」检索';

    const startMs = start ? new Date(start).getTime() : undefined;
    const endMs = end ? new Date(end).getTime() + 86_400_000 - 1 : undefined;

    try {
      const res = await searchMessages({
        q: q || undefined,
        roomid,
        sender_type: senderType ?? undefined,
        msg_type: types.size === 1 ? Array.from(types)[0] : undefined,
        start: startMs,
        end: endMs,
        limit: 1,
      });
      setHint(scopeHint);
      onApply({ query: q, count: res.total });
    } catch {
      setHint('检索失败，请稍后重试');
      setApplying(false);
    } finally {
      setApplying(false);
    }
  };

  const canApply = !applying;

  return (
    <div className="fixed inset-0 z-20 flex justify-end" role="dialog" aria-modal="true" aria-label="搜索与筛选">
      <div className="anim-overlay absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="anim-sheet relative flex h-full w-[360px] max-w-[90vw] flex-col bg-surface shadow-pop">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <Filter size={20} className="text-fg-2" />
          <span className="text-md font-emphasize text-fg">搜索与筛选</span>
          <IconButton label="关闭" className="ml-auto" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto scroll-thin p-4">
          {/* 关键词 */}
          <section>
            <label className="mb-2 block text-xs font-emphasize tracking-meta text-muted">关键词</label>
            <div className="flex items-center gap-2 rounded-md bg-bg px-3 py-2 ring-1 ring-border transition-colors duration-fast ease-standard focus-within:ring-accent">
              <Search size={16} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="检索消息正文"
                aria-label="关键词"
                className="w-full bg-transparent text-base text-fg placeholder:text-meta focus:outline-none"
              />
            </div>
          </section>

          {/* 范围 */}
          <section>
            <label className="mb-2 block text-xs font-emphasize tracking-meta text-muted">范围</label>
            <div className="space-y-1">
              <ScopeRow
                label="全部会话"
                checked={scope.length === 0}
                onChange={() => setScope([])}
              />
              {currentRoomId && (
                <ScopeRow
                  label="当前会话"
                  checked={scope.length === 1 && scope[0] === currentRoomId}
                  onChange={() => setScope([currentRoomId])}
                />
              )}
              {rooms.data?.items.slice(0, 30).map((r) => (
                <ScopeRow
                  key={r.roomid}
                  label={r.room_name}
                  checked={scope.includes(r.roomid)}
                  onChange={() =>
                    setScope((prev) =>
                      prev.includes(r.roomid) ? prev.filter((x) => x !== r.roomid) : [...prev, r.roomid],
                    )
                  }
                />
              ))}
            </div>
          </section>

          {/* 发送者 */}
          <section>
            <label className="mb-2 block text-xs font-emphasize tracking-meta text-muted">发送者</label>
            <div className="inline-flex rounded-md bg-bg p-0.5 ring-1 ring-border">
              {([
                [null, '全部'],
                [1 as SenderType, '员工'],
                [2 as SenderType, '外部'],
              ] as const).map(([val, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSenderType(val)}
                  className={
                    'rounded-sm px-3 py-1.5 text-sm transition-colors duration-fast ease-standard ' +
                    (senderType === val ? 'bg-surface font-emphasize text-accent shadow-raised' : 'text-fg-2')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 消息类型 */}
          <section>
            <label className="mb-2 block text-xs font-emphasize tracking-meta text-muted">消息类型</label>
            <div className="flex flex-wrap gap-2">
              {FILTER_TYPES.map((t) => {
                const active = types.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    aria-pressed={active}
                    className={
                      'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition-colors duration-fast ease-standard ' +
                      (active
                        ? 'border-accent text-accent'
                        : 'border-border text-fg-2 hover:bg-surface-warm')
                    }
                  >
                    {TYPE_ICONS[t]}
                    {MSG_TYPE_LABEL[t]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 时间范围 */}
          <section>
            <label className="mb-2 block text-xs font-emphasize tracking-meta text-muted">时间范围</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                aria-label="开始日期"
                className="flex-1 rounded-md bg-bg px-2 py-1.5 text-sm text-fg ring-1 ring-border focus:outline-none focus:ring-accent"
              />
              <span className="text-meta">~</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                aria-label="结束日期"
                className="flex-1 rounded-md bg-bg px-2 py-1.5 text-sm text-fg ring-1 ring-border focus:outline-none focus:ring-accent"
              />
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-border p-4">
          {hint && <p className="mb-2 text-xs text-warn">{hint}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-md border border-border px-4 py-2 text-sm text-fg-2 transition-colors duration-fast ease-standard hover:bg-surface-warm"
            >
              重置
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!canApply}
              className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-emphasize text-accent-on transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:opacity-50"
            >
              {applying ? '检索中…' : '应用'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScopeRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-fg hover:bg-surface-warm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-accent"
      />
      <span className="truncate-1">{label}</span>
    </label>
  );
}
