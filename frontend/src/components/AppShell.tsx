import { useEffect, useRef, useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { TopBar } from './TopBar';
import { ConversationsList } from './ConversationsList';
import { ChatTimeline } from './ChatTimeline';
import { SearchFilterPanel } from './SearchFilterPanel';
import { EmptyState } from './common';
import { useRouter, parseRoomId } from '../lib/router';

export interface AppliedFilter {
  query: string;
  count: number;
}

/**
 * 应用外壳：顶栏 + 左侧栏（280px）+ 右侧内容区。
 * 负责全局键盘（Cmd/Ctrl+K 聚焦搜索、Esc 关闭浮层）与筛选面板状态。
 */
export function AppShell() {
  const { pathname } = useRouter();
  const roomId = parseRoomId(pathname);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState<AppliedFilter | null>(null);

  // Cmd/Ctrl + K 聚焦左侧搜索框
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape') {
        setFilterOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      <TopBar
        onFocusSearch={() => searchInputRef.current?.focus()}
        onOpenFilter={() => setFilterOpen(true)}
        filterActive={!!applied}
        resultCount={applied?.count ?? null}
      />

      <div className="flex min-h-0 flex-1">
        <ConversationsList searchInputRef={searchInputRef} activeRoomId={roomId} />

        <main className="min-w-0 flex-1 bg-surface-chat">
          {roomId ? (
            <ChatTimeline
              roomId={roomId}
              highlightQuery={applied?.query ?? null}
              onOpenFilter={() => setFilterOpen(true)}
            />
          ) : (
            <EmptyState
              icon={<MessagesSquare size={48} />}
              title="选择左侧会话查看存档"
              description="会话内容经官方会话存档拉取并解密，按时间顺序只读呈现，支持检索与多维筛选。"
            />
          )}
        </main>
      </div>

      <SearchFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => {
          setApplied(f);
          setFilterOpen(false);
        }}
        currentRoomId={roomId}
      />
    </div>
  );
}
