import { Avatar, Tag } from './common';
import { MessageContent, type MediaPayload } from './MessageContent';
import { formatTime, isBotSender, isExternalSender, isOwnSender } from '../lib/format';
import type { Message } from '../types/api';

/** 单条消息行：撤回走居中系统条；其余按身份分左右（本端右绿、对端左白 + 外部/机器人标签）。 */
export function MessageItem({
  message,
  showSenderName,
  highlightQuery,
  onOpenMedia,
}: {
  message: Message;
  showSenderName: boolean;
  highlightQuery?: string | null;
  onOpenMedia: (m: MediaPayload) => void;
}) {
  // 撤回：居中系统提示条（不残留内容）
  if (message.action === 'recall') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-pill bg-tag-recall-bg px-3 py-1 text-xs text-tag-recall-fg">
          {message.sender_name || '对方'} 撤回了一条消息
        </span>
      </div>
    );
  }

  const own = isOwnSender(message.sender_type);
  const external = isExternalSender(message.sender_type);
  const bot = isBotSender(message.sender_type);
  const media =
    message.msg_type === 'image' ||
    message.msg_type === 'video' ||
    message.msg_type === 'file' ||
    message.msg_type === 'voice' ||
    message.msg_type === 'link' ||
    message.msg_type === 'card' ||
    message.msg_type === 'redpacket' ||
    message.msg_type === 'location';

  const bubbleBg = own ? 'bg-bubble-sent text-bubble-sent-fg' : 'bg-bubble-recv text-bubble-recv-fg';

  return (
    <div className={'group flex items-end gap-2 px-4 py-1.5 ' + (own ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar name={message.sender_name} size={36} />

      <div className={'flex max-w-[68%] flex-col ' + (own ? 'items-end' : 'items-start')}>
        {!own && showSenderName && (
          <div className="mb-1 flex items-center gap-1.5 px-1">
            <span className="text-xs font-emphasize text-muted">{message.sender_name || '联系人'}</span>
            {external && <Tag variant="external">外部</Tag>}
            {bot && <Tag variant="bot">机器人</Tag>}
          </div>
        )}

        <div
          className={
            'rounded-bubble shadow-bubble ' +
            bubbleBg +
            ' ' +
            (media ? 'p-1' : 'px-3 py-2 text-base')
          }
        >
          <MessageContent message={message} highlightQuery={highlightQuery} onOpenMedia={onOpenMedia} />
        </div>

        {/* hover 显示时间（--meta） */}
        <span className="mt-0.5 px-1 font-mono text-xs text-meta opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100">
          {formatTime(message.msg_time)}
        </span>
      </div>
    </div>
  );
}
