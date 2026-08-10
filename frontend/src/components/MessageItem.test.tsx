import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageItem } from './MessageItem';
import type { Message } from '../types/api';

const base: Message = {
  msgid: 'm1',
  roomid: 'r1',
  sender_id: 'u1',
  sender_type: 1,
  sender_name: '我',
  msg_type: 'text',
  msg_time: Date.UTC(2024, 0, 15, 1, 5, 0),
  action: 'send',
  content: { text: '报价单已发送' },
};

function renderMsg(over: Partial<Message>) {
  const message = { ...base, ...over } as Message;
  return render(<MessageItem message={message} showSenderName onOpenMedia={() => {}} />);
}

describe('MessageItem', () => {
  it('撤回消息显示居中系统条', () => {
    renderMsg({ action: 'recall', sender_name: '张三' });
    expect(screen.getByText('张三 撤回了一条消息')).toBeInTheDocument();
  });

  it('文本消息渲染正文', () => {
    renderMsg({ content: { text: '你好' } });
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('外部联系人显示「外部」标签', () => {
    renderMsg({ sender_type: 2, sender_name: '客户A' });
    expect(screen.getByText('外部')).toBeInTheDocument();
  });

  it('机器人显示「机器人」标签', () => {
    renderMsg({ sender_type: 3, sender_name: 'Bot' });
    expect(screen.getByText('机器人')).toBeInTheDocument();
  });
});
