import { useState, type ReactNode } from 'react';
import {
  Download,
  FileText,
  Gift,
  Image as ImageIcon,
  ImageOff,
  Link as LinkIcon,
  MapPin,
  Pause,
  Play,
  UserRound,
} from 'lucide-react';
import { getMediaUrl } from '../lib/http';
import { formatBytes, formatDuration, highlightSegments } from '../lib/format';
import { Spinner } from './common';
import type {
  CardContent,
  FileContent,
  ImageContent,
  LinkContent,
  LocationContent,
  Message,
  RedPacketContent,
  TextContent,
  VideoContent,
  VoiceContent,
} from '../types/api';

/** 媒体预览负载（由消息点击传给 MediaPreview）。 */
export interface MediaPayload {
  kind: 'image' | 'video' | 'voice' | 'file';
  url?: string;
  cover?: string;
  name?: string;
  size?: number;
  duration?: number;
  senderName?: string;
  msgTime?: number;
  msgid?: string;
}

const URL_RE = /(https?:\/\/[^\s，。、）)]+)/g;

/** 文本渲染：先按 URL 切分（高亮为 --info 可点），再在普通片段内做关键词高亮。 */
function renderText(text: string, query?: string | null) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(
        <TextSegment key={key++} text={text.slice(last, m.index)} query={query} />,
      );
    }
    const url = m[0];
    nodes.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-info underline-offset-2 hover:underline"
      >
        {url}
      </a>,
    );
    last = m.index + url.length;
  }
  if (last < text.length) {
    nodes.push(<TextSegment key={key++} text={text.slice(last)} query={query} />);
  }
  return nodes;
}

function TextSegment({ text, query }: { text: string; query?: string | null }) {
  const segs = highlightSegments(text, query ?? undefined);
  return (
    <>
      {segs.map((s, i) =>
        s.hit ? (
          <mark key={i} className="rounded-sm bg-tag-external-bg px-0.5 text-tag-external-fg">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/** 文本气泡：超长（>180 字）折叠为「展开全文」（Edge 态）。 */
function TextBubble({ text, query }: { text: string; query?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 180;
  return (
    <div className="break-words">
      <div className={!expanded && long ? 'clamp-6 whitespace-pre-wrap' : 'whitespace-pre-wrap'}>
        {renderText(text, query)}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 inline-flex items-center gap-0.5 text-sm text-info"
        >
          {expanded ? '收起' : '展开全文'}
        </button>
      )}
    </div>
  );
}

export function MessageContent({
  message,
  highlightQuery,
  onOpenMedia,
}: {
  message: Message;
  highlightQuery?: string | null;
  onOpenMedia: (m: MediaPayload) => void;
}) {
  const meta = {
    senderName: message.sender_name,
    msgTime: message.msg_time,
    msgid: message.msgid,
  };

  switch (message.msg_type) {
    case 'text': {
      const c = message.content as TextContent;
      return <TextBubble text={c.text} query={highlightQuery} />;
    }

    case 'image': {
      const c = message.content as ImageContent;
      const url = getMediaUrl(c.url ?? message.media_path, c.thumb);
      return <ImageThumb url={url} onOpen={() => onOpenMedia({ kind: 'image', url, ...meta })} />;
    }

    case 'voice': {
      const c = message.content as VoiceContent;
      const url = getMediaUrl(c.url ?? c.media_path);
      return <VoicePlayer url={url} duration={c.duration} onOpen={() => onOpenMedia({ kind: 'voice', url, duration: c.duration, ...meta })} />;
    }

    case 'video': {
      const c = message.content as VideoContent;
      const cover = getMediaUrl(c.cover);
      const url = getMediaUrl(c.url ?? message.media_path);
      return (
        <button
          type="button"
          onClick={() => onOpenMedia({ kind: 'video', url, cover, duration: c.duration, ...meta })}
          className="relative block overflow-hidden rounded-md"
          style={{ width: 240 }}
          aria-label="播放视频"
        >
          {cover ? (
            <img src={cover} alt="视频封面" className="h-[135px] w-[240px] object-cover" />
          ) : (
            <div className="flex h-[135px] w-[240px] items-center justify-center bg-surface-warm">
              <ImageIcon size={24} className="text-muted" />
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-overlay text-accent-on">
              <Play size={24} />
            </span>
          </span>
          {c.duration != null && (
            <span className="absolute bottom-1 right-1 rounded-sm bg-overlay px-1 font-mono text-xs text-accent-on">
              {formatDuration(c.duration)}
            </span>
          )}
        </button>
      );
    }

    case 'file': {
      const c = message.content as FileContent;
      const url = getMediaUrl(c.url ?? c.media_path);
      return (
        <FileCard
          name={c.name}
          size={c.size}
          ext={c.ext}
          url={url}
          onOpen={() => onOpenMedia({ kind: 'file', url, name: c.name, size: c.size, ...meta })}
        />
      );
    }

    case 'link': {
      const c = message.content as LinkContent;
      return <LinkCard c={c} />;
    }

    case 'card': {
      const c = message.content as CardContent;
      return (
        <div className="flex w-60 items-center gap-3 rounded-md bg-surface-warm px-3 py-2 ring-1 ring-border">
          <UserRound size={28} className="text-muted" />
          <div className="min-w-0">
            <div className="truncate-1 text-md font-emphasize text-fg">{c.name}</div>
            <div className="truncate-1 text-sm text-muted">{c.corp || c.title || '企业微信联系人'}</div>
          </div>
        </div>
      );
    }

    case 'redpacket': {
      const c = message.content as RedPacketContent;
      return (
        <div className="flex w-60 items-center gap-3 rounded-md bg-tag-external-bg px-3 py-2">
          <Gift size={28} className="text-tag-external-fg" />
          <div className="min-w-0">
            <div className="truncate-1 text-md font-emphasize text-tag-external-fg">
              {c.status === 'opened' && c.amount ? `${c.amount} 元` : '领取红包'}
            </div>
            <div className="truncate-1 text-sm text-tag-external-fg">{c.msg || '企业微信红包'}</div>
          </div>
        </div>
      );
    }

    case 'location': {
      const c = message.content as LocationContent;
      return (
        <div className="w-60 rounded-md bg-surface ring-1 ring-border">
          <div className="flex h-24 items-center justify-center bg-surface-warm">
            <MapPin size={28} className="text-muted" />
          </div>
          <div className="px-3 py-2">
            <div className="truncate-1 text-md font-emphasize text-fg">{c.name}</div>
            {c.address && <div className="truncate-1 text-sm text-muted">{c.address}</div>}
          </div>
        </div>
      );
    }

    case 'sys': {
      const c = message.content as { text?: string };
      return (
        <div className="mx-auto max-w-md rounded-md bg-tag-recall-bg px-3 py-1.5 text-center text-sm text-tag-recall-fg">
          {c.text || '系统通知'}
        </div>
      );
    }

    default:
      return (
        <div className="text-sm text-muted">暂不支持的消息类型：{message.msg_type}</div>
      );
  }
}

function ImageThumb({ url, onOpen }: { url?: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  if (failed || !url) {
    return (
      <div className="flex h-[120px] w-[160px] flex-col items-center justify-center rounded-md bg-surface-warm text-meta">
        <ImageOff size={24} />
        <span className="mt-1 text-xs">媒体暂不可用</span>
      </div>
    );
  }
  return (
    <button type="button" onClick={onOpen} className="relative block" style={{ maxWidth: 240 }} aria-label="查看大图">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size={20} />
        </div>
      )}
      <img
        src={url}
        alt="图片消息"
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
        className="max-h-[240px] w-auto rounded-md object-cover"
      />
    </button>
  );
}

function VoicePlayer({ url, duration, onOpen }: { url?: string; duration: number; onOpen: () => void }) {
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!url) {
      onOpen();
      return;
    }
    setPlaying((p) => !p);
    onOpen();
  };
  return (
    <div className="flex w-48 items-center gap-2 rounded-md bg-surface-warm px-3 py-2 ring-1 ring-border">
      <button type="button" onClick={toggle} aria-label={playing ? '暂停语音' : '播放语音'} className="text-fg-2">
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className="flex flex-1 items-end gap-0.5" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="w-0.5 rounded-pill bg-fg-2/40"
            style={{ height: 4 + ((i * 7) % 14) }}
          />
        ))}
      </div>
      <span className="shrink-0 font-mono text-xs text-meta">{formatDuration(duration)}</span>
    </div>
  );
}

function FileCard({
  name,
  size,
  ext,
  url,
  onOpen,
}: {
  name: string;
  size?: number;
  ext?: string;
  url?: string;
  onOpen: () => void;
}) {
  return (
    <div className="flex w-64 items-center gap-3 rounded-md bg-surface-warm px-3 py-2 ring-1 ring-border">
      <FileText size={28} className="shrink-0 text-info" />
      <div className="min-w-0 flex-1">
        <div className="truncate-1 text-base font-emphasize text-fg">{name}</div>
        <div className="font-mono text-xs text-meta">
          {ext ? `${ext.toUpperCase()} · ` : ''}
          {formatBytes(size)}
        </div>
      </div>
      {url && (
        <a
          href={url}
          download={name}
          aria-label="下载文件"
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-fg-2 transition-colors duration-fast ease-standard hover:bg-surface hover:text-fg"
          onClick={onOpen}
        >
          <Download size={20} />
        </a>
      )}
    </div>
  );
}

function LinkCard({ c }: { c: LinkContent }) {
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-72 items-center gap-3 rounded-md bg-surface px-3 py-2 ring-1 ring-border transition-colors duration-fast ease-standard hover:bg-surface-warm"
    >
      <LinkIcon size={24} className="shrink-0 text-info" />
      <div className="min-w-0 flex-1">
        <div className="truncate-1 text-base font-emphasize text-fg">{c.title}</div>
        {c.desc && <div className="truncate-1 text-sm text-muted">{c.desc}</div>}
        <div className="truncate-1 font-mono text-xs text-meta">{c.domain || c.url}</div>
      </div>
    </a>
  );
}
