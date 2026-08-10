import { Download, Filter, MessagesSquare, Search } from 'lucide-react';
import { IconButton } from './common';

/**
 * 顶栏：全局搜索入口 / 筛选触发 / 导出（禁用态，提示「即将上线」）。
 * 强调色 ≤2 处：仅筛选激活态的 accent 指示 + 品牌标识（此处品牌标识用中性 fg，不占用强调色）。
 */
export function TopBar({
  onFocusSearch,
  onOpenFilter,
  filterActive,
  resultCount,
}: {
  onFocusSearch: () => void;
  onOpenFilter: () => void;
  filterActive: boolean;
  resultCount: number | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2 text-fg">
        <MessagesSquare size={20} className="text-fg-2" />
        <span className="text-md font-emphasize tracking-meta">企业微信会话存档</span>
      </div>

      <div className="ml-2 hidden text-xs text-muted sm:block">只读存档 · 合规留存</div>

      <div className="ml-auto flex items-center gap-1">
        {/* 全局搜索入口：聚焦左侧列表搜索框（Cmd/Ctrl+K） */}
        <IconButton label="搜索会话" onClick={onFocusSearch}>
          <Search size={20} />
        </IconButton>

        {/* 筛选触发：激活态以 accent 描边指示（每屏 ≤2 处强调色之一） */}
        <IconButton
          label="搜索与筛选"
          onClick={onOpenFilter}
          className={filterActive ? 'text-accent' : ''}
        >
          <Filter size={20} />
        </IconButton>
        {filterActive && (
          <span className="ml-1 hidden rounded-pill bg-tag-external-bg px-2 py-0.5 text-xs font-emphasize text-tag-external-fg sm:inline">
            命中 {resultCount ?? 0} 条
          </span>
        )}

        {/* 导出：禁用态，提示即将上线 */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="即将上线"
          className="ml-1 inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-md px-3 text-sm text-muted opacity-60"
        >
          <Download size={20} />
          <span className="hidden sm:inline">导出</span>
        </button>
      </div>
    </header>
  );
}
