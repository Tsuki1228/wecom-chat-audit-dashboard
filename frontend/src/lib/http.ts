import { ApiError, type ApiEnvelope, type LoginRequest, type LoginResponse } from '../types/api';

/** API 统一前缀（vite dev/preview proxy 将 /api -> :8000）。 */
export const API_BASE = '/api/v1';

const TOKEN_KEY = 'wecom_archive_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* 隐私模式等场景静默失败 */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

/** 未授权事件名：401 时派发，供上层触发重新登录。 */
export const UNAUTHORIZED_EVENT = 'wecom:unauthorized';

function emitUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
}

/** 媒体代理地址（演示态返回占位/本地路径）。用于 <img>/<a> 直链，走同一 /api 代理。 */
export function getMediaUrl(mediaPath?: string, fallbackUrl?: string): string | undefined {
  const raw = mediaPath || fallbackUrl;
  if (!raw) return undefined;
  if (/^https?:\/\//.test(raw)) return raw;
  const path = encodeURIComponent(raw);
  return `${API_BASE}/media?path=${path}`;
}

/** 登录获取 JWT（演示账号 admin/admin123）。 */
export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const envelope = (await res.json()) as ApiEnvelope<LoginResponse>;
  if (envelope.code !== 0 || !envelope.data?.token) {
    throw new ApiError(envelope.message || '登录失败', envelope.code, res.status);
  }
  setToken(envelope.data.token);
  return envelope.data;
}

/**
 * 通用请求封装：注入 Bearer；解析统一信封；非 0 码 / 401 / 网络异常统一抛 ApiError。
 * 401 会清除 token 并派发未授权事件，由上层决定是否重新登录。
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (e) {
    throw new ApiError('网络请求失败，请检查后端是否已启动（:8000）', -1);
  }

  // 未授权：清除凭证并通知上层重新登录
  if (res.status === 401) {
    clearToken();
    emitUnauthorized();
    throw new ApiError('登录已失效，请重新登录', -1, 401);
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('响应解析失败', -1, res.status);
  }

  if (envelope.code !== 0) {
    throw new ApiError(envelope.message || '请求失败', envelope.code, res.status);
  }
  return envelope.data;
}
