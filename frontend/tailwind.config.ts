import type { Config } from 'tailwindcss';

/**
 * Tailwind 主题扩展：所有颜色 / 字体 / 间距 / 圆角 / 阴影 / 动效 均引用 design-tokens.css 的 CSS 变量。
 * 严禁在 TSX 中写死 hex；一律通过下方语义色名（如 bg-surface text-fg）引用 var(--xxx)。
 * 唯一例外：团队红线允许的 #fff / #000（本项目中亦尽量改用 --surface / --fg）。
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // A1-identity
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-chat': 'var(--surface-chat)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        border: 'var(--border)',
        // A2-semantic
        'accent-on': 'var(--accent-on)',
        'accent-hover': 'var(--accent-hover)',
        'accent-active': 'var(--accent-active)',
        success: 'var(--success)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        // B-slot
        'surface-warm': 'var(--surface-warm)',
        'fg-2': 'var(--fg-2)',
        meta: 'var(--meta)',
        'border-soft': 'var(--border-soft)',
        'bubble-sent': 'var(--bubble-sent)',
        'bubble-sent-fg': 'var(--bubble-sent-fg)',
        'bubble-recv': 'var(--bubble-recv)',
        'bubble-recv-fg': 'var(--bubble-recv-fg)',
        'tag-external-bg': 'var(--tag-external-bg)',
        'tag-external-fg': 'var(--tag-external-fg)',
        'tag-recall-bg': 'var(--tag-recall-bg)',
        'tag-recall-fg': 'var(--tag-recall-fg)',
        'tag-bot-bg': 'var(--tag-bot-bg)',
        'tag-bot-fg': 'var(--tag-bot-fg)',
        skeleton: 'var(--skeleton)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: '1.5' }],
        sm: ['var(--text-sm)', { lineHeight: '1.5' }],
        base: ['var(--text-base)', { lineHeight: '1.5' }],
        md: ['var(--text-md)', { lineHeight: '1.4' }],
        lg: ['var(--text-lg)', { lineHeight: '1.3' }],
        xl: ['var(--text-xl)', { lineHeight: '1.25' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '1.2' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '1.2' }],
      },
      fontWeight: {
        read: 'var(--weight-read)',
        emphasize: 'var(--weight-emphasize)',
        announce: 'var(--weight-announce)',
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
        bubble: 'var(--bubble-radius)',
      },
      boxShadow: {
        flat: 'var(--elev-flat)',
        ring: 'var(--elev-ring)',
        raised: 'var(--elev-raised)',
        pop: 'var(--elev-pop)',
        bubble: 'var(--elev-bubble)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
      },
    },
  },
  plugins: [],
} satisfies Config;
