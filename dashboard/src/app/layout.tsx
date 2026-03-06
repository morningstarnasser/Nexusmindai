import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NexusMind Dashboard',
  description: 'AI Agent Management and Orchestration Platform',
  viewport: 'width=device-width, initial-scale=1',
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
        <div className="flex h-screen bg-slate-950">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto">
              <div className="p-8">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
