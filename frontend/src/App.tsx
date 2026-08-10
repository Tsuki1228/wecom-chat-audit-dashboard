import { RouterProvider } from './lib/router';
import { AppShell } from './components/AppShell';
import { useAuth } from './hooks/useAuth';
import { ErrorState, Spinner } from './components/common';

/**
 * 应用根：先完成鉴权（演示态自动登录），再挂载路由外壳。
 * 鉴权中 / 鉴权失败 均给出明确状态与重试，避免静默白屏。
 */
export function App() {
  const { authed, loading, error, retry } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg text-fg">
        <Spinner size={28} />
        <p className="text-sm text-muted">正在登录演示账号…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg p-6">
        <div className="w-full max-w-md">
          <ErrorState
            error={error}
            onRetry={retry}
          />
          <p className="mt-3 text-center text-xs text-meta">
            演示账号 admin / admin123 · 需后端运行于 :8000
          </p>
        </div>
      </div>
    );
  }

  return (
    <RouterProvider>
      <AppShell />
    </RouterProvider>
  );
}
