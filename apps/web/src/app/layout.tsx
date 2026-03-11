import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tari Agent Arena',
  description: "Autonomous AI agents compete in Prisoner's Dilemma matches",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className="bg-slate-950 text-slate-50 antialiased">{children}</body>
    </html>
  );
}
