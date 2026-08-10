import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../types/api';
import { clearToken, getToken, login, UNAUTHORIZED_EVENT } from '../lib/http';

export interface AuthState {
  authed: boolean;
  loading: boolean;
  error: ApiError | null;
  retry: () => void;
}

/** 演示态账号（Spec §12 验证步骤）：admin / admin123。 */
const DEMO_USER = 'admin';
const DEMO_PASS = 'admin123';

/**
 * 鉴权状态管理：应用启动若无 JWT，则自动用演示账号登录（页面清单无独立登录页）。
 * 监听 401（UNAUTHORIZED_EVENT）清除凭证并提示重新登录。
 */
export function useAuth(): AuthState {
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  const [loading, setLoading] = useState<boolean>(() => !getToken());
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  const doLogin = useCallback(() => {
    setLoading(true);
    setError(null);
    login({ username: DEMO_USER, password: DEMO_PASS })
      .then(() => {
        setAuthed(true);
        setLoading(false);
      })
      .catch((e: unknown) => {
        clearToken();
        setAuthed(false);
        setLoading(false);
        setError(e instanceof ApiError ? e : new ApiError(String(e)));
      });
  }, []);

  useEffect(() => {
    if (!getToken()) {
      doLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    const onUnauthorized = () => {
      setAuthed(false);
      setError(new ApiError('登录已失效，请重新登录', -1, 401));
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const retry = useCallback(() => {
    clearToken();
    setTick((t) => t + 1);
  }, []);

  return { authed, loading, error, retry };
}
