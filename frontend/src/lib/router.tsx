import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface RouterState {
  pathname: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterState | null>(null);

/**
 * 轻量前端路由（避免引入额外依赖，契合「手写」原则）。
 * 基于 pathname + popstate，兼容 Vite dev/preview 的 SPA fallback。
 * 路由：/ 占位（左栏列表）、/room/:roomid 落地聊天时间线。
 */
export function RouterProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname || '/',
  );

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, '', to);
    setPathname(to);
  }, []);

  return (
    <RouterContext.Provider value={{ pathname, navigate }}>{children}</RouterContext.Provider>
  );
}

export function useRouter(): RouterState {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter 必须在 RouterProvider 内使用');
  return ctx;
}

/** 解析 /room/:roomid。 */
export function parseRoomId(pathname: string): string | null {
  const m = pathname.match(/^\/room\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}
