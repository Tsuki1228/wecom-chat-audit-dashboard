import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react';
import { getMediaUrl } from '../lib/http';
import { ApiError } from '../types/api';

/** 头像：图片优先，否则用首字 / 指定图标（中性 token 底色，禁止硬编码颜色）。 */
export function Avatar({
  name,
  src,
  icon,
  size = 36,
}: {
  name?: string;
  src?: string;
  icon?: ReactNode;
  size?: number;
}) {
  const url = getMediaUrl(src);
  const style = { width: size, height: size };
  const initials = (name ?? '').trim().slice(0, 1) || (icon ? undefined : '?');
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill bg-border-soft text-fg-2"
      style={style}
      aria-hidden={false}
    >
      {url ? (
        <img src={url} alt={name ?? '头像'} className="h-full w-full object-cover" />
      ) : icon ? (
        <span className="text-muted">{icon}</span>
      ) : (
        <span
          className="font-emphasize text-fg-2"
          style={{ fontSize: Math.max(12, size * 0.4) }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

/** 图标按钮：带 aria-label、focus-visible、hover 态，最小点击区 ≥40px。 */
export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={
        'inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-2 transition-colors duration-fast ease-standard hover:bg-surface-warm hover:text-fg focus-visible:text-fg disabled:opacity-40 disabled:pointer-events-none ' +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );
}

/** 标签（外部联系人 / 撤回 / 机器人 / 普通）。底色与文字均取自 Token。 */
export function Tag({
  children,
  variant = 'plain',
  className = '',
}: {
  children: ReactNode;
  variant?: 'external' | 'recall' | 'bot' | 'plain';
  className?: string;
}) {
  const map: Record<string, string> = {
    external: 'bg-tag-external-bg text-tag-external-fg',
    recall: 'bg-tag-recall-bg text-tag-recall-fg',
    bot: 'bg-tag-bot-bg text-tag-bot-fg',
    plain: 'bg-surface-warm text-muted',
  };
  return (
    <span
      className={
        'inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-emphasize tracking-meta ' +
        map[variant] +
        ' ' +
        className
      }
    >
      {children}
    </span>
  );
}

/** 骨架块。 */
export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <span className={'block rounded-md bg-skeleton skeleton-pulse ' + className} style={style} />;
}

/** 空态：图标 + 标题 + 描述 + 可选操作。 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 text-meta">{icon}</div>
      <p className="text-md font-emphasize text-fg">{title}</p>
      {description && <p className="mt-2 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** 错误态：左侧 danger 指示条 + 原因 + 重试。不暴露技术栈细节。 */
export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: ApiError | null;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const msg = error?.message || '加载失败，请稍后重试';
  return (
    <div
      className={
        'flex items-start gap-3 rounded-md border-l-2 border-danger bg-surface-warm px-4 py-3 text-sm text-fg ' +
        (compact ? '' : ' m-4')
      }
      role="alert"
    >
      <TriangleAlert size={20} className="mt-0.5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="font-emphasize">{msg}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-accent transition-colors duration-fast ease-standard hover:bg-tag-external-bg"
          >
            <RefreshCw size={16} />
            重试
          </button>
        )}
      </div>
    </div>
  );
}

/** 行内加载指示（图片/媒体）。 */
export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} className={'animate-spin text-accent ' + className} />;
}
