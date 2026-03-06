'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Github, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const navLinks = [
  { name: 'Features', href: '/#features' },
  { name: 'Quick Start', href: '/#quickstart' },
  { name: 'Integrations', href: '/integrations' },
];

function MarketingNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-shadow">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">NexusMind</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <a
            href="https://github.com/morningstarnasser/NexusMind"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
          <Link
            href="/agents"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Get Started
          </Link>
        </div>

        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <a
              href="https://github.com/morningstarnasser/NexusMind"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-slate-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <Link
              href="/agents"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800/50 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">NexusMind</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md">
              The ultimate autonomous AI agent platform. Privacy-first, locally hosted,
              infinitely extensible.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/integrations" className="text-sm text-slate-400 hover:text-white transition-colors">Integrations</Link></li>
              <li><Link href="/#quickstart" className="text-sm text-slate-400 hover:text-white transition-colors">Quick Start</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Community</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com/morningstarnasser/NexusMind" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Discord</a>
              </li>
              <li>
                <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Docs</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Built by Morningstar. Open source under MIT License.
          </p>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} NexusMind. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
