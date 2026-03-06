'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Brain,
  Home,
  Wrench,
  Monitor,
  ArrowRight,
  Search,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Integration data                                                   */
/* ------------------------------------------------------------------ */
interface Integration {
  name: string;
  description: string;
}

interface Category {
  title: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgColor: string;
  items: Integration[];
}

const categories: Category[] = [
  {
    title: 'Chat Platforms',
    icon: MessageSquare,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-600/10',
    items: [
      { name: 'Telegram', description: 'Full bot API with inline keyboards, media, and groups.' },
      { name: 'Discord', description: 'Rich embeds, slash commands, voice channel support.' },
      { name: 'Slack', description: 'Bolt framework integration with blocks and modals.' },
      { name: 'WhatsApp', description: 'End-to-end encrypted messaging via WhatsApp Web.' },
      { name: 'Signal', description: 'Privacy-first messaging with Signal Protocol.' },
      { name: 'Microsoft Teams', description: 'Enterprise chat with Bot Framework integration.' },
      { name: 'Email', description: 'IMAP/SMTP support via Nodemailer for any email provider.' },
      { name: 'SMS', description: 'Twilio-powered SMS and MMS messaging.' },
      { name: 'IRC', description: 'Classic IRC protocol support for any server.' },
      { name: 'Matrix', description: 'Decentralized, federated communication protocol.' },
      { name: 'Webhooks', description: 'Generic webhook adapter for any HTTP-based service.' },
    ],
  },
  {
    title: 'AI Models',
    icon: Brain,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    bgColor: 'bg-purple-600/10',
    items: [
      { name: 'Anthropic Claude', description: 'Claude 3.5 Sonnet, Opus, and Haiku models.' },
      { name: 'OpenAI GPT', description: 'GPT-4o, GPT-4 Turbo, and legacy models.' },
      { name: 'DeepSeek', description: 'DeepSeek-V2 and DeepSeek Coder models.' },
      { name: 'Google AI / Gemini', description: 'Gemini Pro, Ultra, and PaLM models.' },
      { name: 'Mistral', description: 'Mistral Large, Medium, and open-weight models.' },
      { name: 'Groq', description: 'Ultra-fast inference with LPU hardware acceleration.' },
      { name: 'Nvidia NIM', description: 'Nvidia-hosted models with NIM microservices.' },
    ],
  },
  {
    title: 'Smart Home',
    icon: Home,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-600/10',
    items: [
      { name: 'Home Assistant', description: 'Full home automation control via HA REST API.' },
    ],
  },
  {
    title: 'Productivity',
    icon: Wrench,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-600/10',
    items: [
      { name: 'GitHub', description: 'Issues, PRs, actions, and repo management.' },
      { name: 'Cron / Scheduler', description: 'node-cron powered task scheduling engine.' },
      { name: 'Webhooks', description: 'Inbound/outbound HTTP hooks for any workflow.' },
    ],
  },
  {
    title: 'Platforms',
    icon: Monitor,
    color: 'text-rose-400',
    borderColor: 'border-rose-500/20',
    bgColor: 'bg-rose-600/10',
    items: [
      { name: 'macOS', description: 'Native macOS support with Apple Silicon optimization.' },
      { name: 'Linux', description: 'Full Linux support: Ubuntu, Debian, Fedora, Arch.' },
      { name: 'Windows', description: 'Windows 10/11 with WSL2 support.' },
      { name: 'Docker / Synology', description: 'Containerized deployment for any Docker host.' },
    ],
  },
];

const totalIntegrations = categories.reduce((sum, cat) => sum + cat.items.length, 0);

/* ------------------------------------------------------------------ */
/*  Fade-in hook                                                       */
/* ------------------------------------------------------------------ */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, className: visible ? 'animate-fade-in-up' : 'opacity-0' };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function IntegrationsPage() {
  const [search, setSearch] = useState('');

  const filtered = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="pt-24 pb-16">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Integrations</h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
          {totalIntegrations}+ integrations across chat platforms, AI models, smart home,
          productivity tools, and deployment platforms.
        </p>

        {/* Search */}
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        {filtered.map((cat) => {
          const Icon = cat.icon;
          return (
            <CategorySection key={cat.title} category={cat} Icon={Icon} />
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No integrations found for &ldquo;{search}&rdquo;</p>
            <button
              onClick={() => setSearch('')}
              className="mt-4 text-blue-400 hover:text-blue-300 font-medium"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-6 mt-24 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Don&apos;t see your platform?
        </h2>
        <p className="text-slate-400 mb-8">
          NexusMind&apos;s adapter system makes it easy to add new integrations.
          Contribute on GitHub or request one.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/agents"
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/morningstarnasser/NexusMind"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category section                                                   */
/* ------------------------------------------------------------------ */
function CategorySection({ category, Icon }: { category: Category; Icon: React.ElementType }) {
  const fade = useFadeIn();

  return (
    <div ref={fade.ref} className={fade.className}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-9 h-9 rounded-lg ${category.bgColor} ${category.borderColor} border flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${category.color}`} />
        </div>
        <h2 className="text-xl font-bold text-white">{category.title}</h2>
        <span className="text-sm text-slate-500 ml-1">({category.items.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {category.items.map((item) => (
          <div
            key={item.name}
            className={`p-5 rounded-xl border ${category.borderColor} bg-slate-900/40 hover:bg-slate-900/70 transition-colors group`}
          >
            <h3 className="text-base font-semibold text-white mb-1.5 group-hover:text-blue-300 transition-colors">
              {item.name}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
