import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Provider } from '@/lib/store';
import Shell from '@/components/Shell';
export const metadata: Metadata = { title: { default: 'AETHRA — Astronaut Health Monitoring & Decision Support', template: '%s · AETHRA' }, description: 'Beyond Earth, Beyond Limits. Research prototype for personalized, mission-aware, offline-first astronaut health decision support. Not a medical device.', manifest: '/manifest.webmanifest', icons: { icon: '/icon.svg' } };
export const viewport: Viewport = { themeColor: '#F2F4F8', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><Provider><Shell>{children}</Shell></Provider></body></html>);
}
