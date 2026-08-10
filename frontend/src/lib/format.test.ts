import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatListTime,
  isOwnSender,
  isExternalSender,
  isBotSender,
  highlightSegments,
  formatBytes,
  roomGroupLabel,
} from './format';

describe('formatTime', () => {
  it('无效值返回空串', () => {
    expect(formatTime(0)).toBe('');
    expect(formatTime(NaN)).toBe('');
    expect(formatTime(undefined)).toBe('');
  });
  it('有效时间戳返回 HH:mm 格式', () => {
    // 仅验证格式，不绑定时区
    expect(formatTime(Date.UTC(2024, 0, 15, 1, 5, 0))).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('formatListTime', () => {
  it('无效值返回空串', () => {
    expect(formatListTime(undefined)).toBe('');
    expect(formatListTime(0)).toBe('');
  });
});

describe('发送者类型判断', () => {
  it('isOwnSender 仅员工(1)', () => {
    expect(isOwnSender(1)).toBe(true);
    expect(isOwnSender(2)).toBe(false);
    expect(isOwnSender(3)).toBe(false);
  });
  it('isExternalSender 仅外部(2)', () => {
    expect(isExternalSender(2)).toBe(true);
    expect(isExternalSender(1)).toBe(false);
  });
  it('isBotSender 仅机器人(3)', () => {
    expect(isBotSender(3)).toBe(true);
    expect(isBotSender(1)).toBe(false);
  });
});

describe('highlightSegments', () => {
  it('无 query 整体 hit=false', () => {
    expect(highlightSegments('hello')).toEqual([{ text: 'hello', hit: false }]);
  });
  it('命中分割前后片段', () => {
    expect(highlightSegments('hello world', 'world')).toEqual([
      { text: 'hello ', hit: false },
      { text: 'world', hit: true },
    ]);
  });
  it('大小写不敏感', () => {
    expect(highlightSegments('Hello', 'hello')).toEqual([{ text: 'Hello', hit: true }]);
  });
});

describe('formatBytes', () => {
  it('字节 / KB / MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });
  it('负数/空返回空串', () => {
    expect(formatBytes(-1)).toBe('');
    expect(formatBytes(undefined)).toBe('');
  });
});

describe('roomGroupLabel', () => {
  it('按 room_type 映射分组', () => {
    expect(roomGroupLabel(1)).toBe('内部群');
    expect(roomGroupLabel(2)).toBe('单聊');
    expect(roomGroupLabel(3)).toBe('客户群');
    expect(roomGroupLabel(99 as unknown as 1)).toBe('其他');
  });
});
