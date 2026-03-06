import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NexusMind - Autonomous AI Agent Platform',
  description: 'The ultimate autonomous AI agent platform. Deploy intelligent agents across Telegram, Discord, Slack, WhatsApp and 11+ platforms.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            --background: 0 0% 3%;
            --foreground: 0 0% 98%;
            --card: 0 0% 8%;
            --card-foreground: 0 0% 98%;
            --primary: 210 100% 50%;
            --primary-foreground: 210 40% 96%;
            --secondary: 217 32% 17%;
            --secondary-foreground: 210 40% 96%;
            --muted: 217 32% 17%;
            --muted-foreground: 215 13% 34%;
            --accent: 216 100% 50%;
            --accent-foreground: 210 40% 96%;
            --destructive: 0 84% 60%;
            --destructive-foreground: 210 40% 96%;
            --border: 217 32% 17%;
            --input: 217 32% 17%;
            --ring: 212 95% 58%;
            --radius: 0.5rem;
          }
        `}</style>
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
