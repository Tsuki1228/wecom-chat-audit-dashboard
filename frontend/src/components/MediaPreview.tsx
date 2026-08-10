import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, FileText, Pause, Play, Video as VideoIcon, X, ZoomIn } from 'lucide-react';
import { Spinner } from './common';
import { formatBytes, formatDuration, formatMetaTime } from '../lib/format';
import type { MediaPayload } from './MessageContent';

const KIND_LABEL: Record<MediaPayload['kind'], string> = {
  image: '图片预览',
  video: '视频播放',
  voice: '语音播放',
  file: '文件详情',
};

/** Lightbox 媒体预览浮层：图片放大 / 语音视频播放 / 文件下载 + 元信息（发送者 / 时间 / msgid / 复制）。 */
export function MediaPreview({ media, onClose }: { media: MediaPayload; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoading, setImgLoading] = useState(media.kind === 'image');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleVoice = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => undefined);
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const copyMsgId = () => {
    if (!media.msgid) return;
    void navigator.clipboard?.writeText(media.msgid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      className="anim-overlay fixed inset-0 z-30 flex flex-col bg-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={KIND_LABEL[media.kind]}
    >
      {/* 顶栏 */}
      <div className="flex h-14 shrink-0 items-center gap-3 px-4 text-accent-on">
        <span className="text-md font-emphasize">{KIND_LABEL[media.kind]}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="关闭预览"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-fast ease-standard hover:bg-white/15"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
        {media.kind === 'image' &&
          (imgFailed ? (
              <div className="flex flex-col items-center text-accent-on">
                <VideoIcon size={48} />
              <span className="mt-2 text-sm">图片暂不可用，可能已超过保留窗口</span>
            </div>
          ) : (
            <div className="relative">
              {imgLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner size={24} className="text-accent-on" />
                </div>
              )}
              <img
                src={media.url}
                alt="图片预览"
                onLoad={() => setImgLoading(false)}
                onError={() => {
                  setImgFailed(true);
                  setImgLoading(false);
                }}
                className="max-h-[70vh] max-w-[80vw] rounded-lg object-contain transition-transform duration-base ease-standard"
                style={{ transform: zoom ? 'scale(1.8)' : 'scale(1)' }}
              />
            </div>
          ))}

        {media.kind === 'video' && (
          <video src={media.url} controls className="max-h-[70vh] max-w-[80vw] rounded-lg bg-black" />
        )}

        {media.kind === 'voice' && (
          <div className="flex w-80 flex-col items-center gap-4 rounded-lg bg-surface p-6">
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={playing ? '暂停' : '播放'}
              className="flex h-16 w-16 items-center justify-center rounded-pill bg-accent text-accent-on"
            >
              {playing ? <Pause size={28} /> : <Play size={28} />}
            </button>
            <span className="font-mono text-sm text-meta">{formatDuration(media.duration)}</span>
            <audio
              ref={audioRef}
              src={media.url}
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
            />
          </div>
        )}

        {media.kind === 'file' && (
          <div className="flex w-80 flex-col items-center gap-4 rounded-lg bg-surface p-6 text-center">
            <FileText size={48} className="text-info" />
            <div className="min-w-0">
              <div className="truncate-1 text-md font-emphasize text-fg">{media.name}</div>
              <div className="font-mono text-xs text-meta">{formatBytes(media.size)}</div>
            </div>
            {media.url && (
              <a
                href={media.url}
                download={media.name}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-emphasize text-accent-on transition-colors duration-fast ease-standard hover:bg-accent-hover"
              >
                <Download size={20} />
                下载文件
              </a>
            )}
          </div>
        )}
      </div>

      {/* 元信息面板 */}
      <div className="shrink-0 border-t border-white/15 px-4 py-3 text-accent-on/90">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          {media.senderName && <span>发送：{media.senderName}</span>}
          {media.msgTime && <span className="font-mono">{formatMetaTime(media.msgTime)}</span>}
          {media.msgid && (
            <span className="flex items-center gap-1.5 font-mono">
              msgid: {media.msgid}
              <button
                type="button"
                onClick={copyMsgId}
                aria-label="复制 msgid"
                className="inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors duration-fast ease-standard hover:bg-white/15"
              >
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </button>
            </span>
          )}
        </div>
      </div>

      {/* 图片缩放控制 */}
      {media.kind === 'image' && !imgFailed && (
        <button
          type="button"
          onClick={() => setZoom((z) => !z)}
          aria-label={zoom ? '还原' : '放大'}
          className="absolute bottom-20 right-6 inline-flex h-11 w-11 items-center justify-center rounded-pill bg-surface text-fg-2 shadow-pop transition-colors duration-fast ease-standard hover:bg-surface-warm"
        >
          <ZoomIn size={20} />
        </button>
      )}
    </div>
  );
}
