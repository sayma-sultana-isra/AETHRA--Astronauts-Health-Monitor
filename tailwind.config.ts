import type { Config } from 'tailwindcss';
/** AETHRA "Flight Deck" design tokens. Colours are CSS variables (see app/globals.css) so print can swap them. */
const t = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { bg: t('bg'), bg2: t('bg2'), card: t('card'), line: t('line'), cyan: t('cyan'), teal: t('teal'), tx: t('tx'), mute: t('mute'), warn: t('warn'), crit: t('crit'), navy: t('navy'), navy2: t('navy2'), onaccent: t('onaccent') },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    boxShadow: {
      panel: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 12px 32px -16px rgb(0 0 0 / 0.7)',
      glow: '0 0 0 1px rgb(var(--cyan) / 0.35), 0 0 24px -4px rgb(var(--cyan) / 0.45)',
      alert: '0 0 0 1px rgb(var(--crit) / 0.5), 0 0 28px -6px rgb(var(--crit) / 0.6)',
    },
  } },
  plugins: [],
};
export default config;
