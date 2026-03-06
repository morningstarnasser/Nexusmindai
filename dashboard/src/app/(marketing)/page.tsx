'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Brain,
  Server,
  MessageSquare,
  Heart,
  Puzzle,
  Shield,
  Copy,
  Check,
  ArrowRight,
  Github,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Quick Start tab data                                               */
/* ------------------------------------------------------------------ */
const installTabs = [
  {
    id: 'npm',
    label: 'npm',
    code: 'npm i -g nexusmind',
  },
  {
    id: 'curl',
    label: 'curl',
    code: 'curl -fsSL https://nexusmind.ai/install.sh | bash',
  },
  {
    id: 'source',
    label: 'Source',
    code: `git clone https://github.com/morningstarnasser/NexusMind.git
cd NexusMind
npm install
npm run build
npm start`,
  },
];

/* ------------------------------------------------------------------ */
/*  Feature cards                                                      */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: Server,
    title: 'Runs Locally',
    description: 'Privacy-first. Your machine, your data. No cloud dependency required.',
  },
  {
    icon: MessageSquare,
    title: 'Any Chat App',
    description: 'Telegram, Discord, Slack, WhatsApp, Signal, Teams, and 11+ platforms.',
  },
  {
    icon: Brain,
    title: 'Persistent Memory',
    description: 'Episodic, semantic, and working memory. Your agent never forgets.',
  },
  {
    icon: Heart,
    title: 'Heartbeat Engine',
    description: 'Autonomous scheduling, cron tasks, and self-initiated actions.',
  },
  {
    icon: Puzzle,
    title: 'Skills & Plugins',
    description: 'Extensible skill system. Community plugins. Self-modifying behavior.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Encryption at rest, granular permissions, full audit logging.',
  },
];

/* ------------------------------------------------------------------ */
/*  Integration logos (top ones shown on landing)                       */
/* ------------------------------------------------------------------ */
const topIntegrations = [
  'Telegram', 'Discord', 'Slack', 'WhatsApp', 'Signal',
  'Teams', 'Claude', 'GPT-4', 'DeepSeek', 'Home Assistant',
  'GitHub', 'Docker',
];

/* ------------------------------------------------------------------ */
/*  Copy-to-clipboard button                                           */
/* ------------------------------------------------------------------ */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Intersection observer hook for fade-in                             */
/* ------------------------------------------------------------------ */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, className: visible ? 'animate-fade-in-up' : 'opacity-0' };
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */
function Section({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  const fade = useFadeIn();
  return (
    <section id={id} ref={fade.ref} className={`${fade.className} ${className}`}>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('npm');

  return (
    <>
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent_70%)]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-700/50 bg-slate-900/50 backdrop-blur mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">v1.0 &mdash; Now Open Source</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6">
            Nexus<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Mind</span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 font-medium mb-4">
            The Ultimate Autonomous AI Agent Platform
          </p>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            The AI that actually does things. Deploy intelligent agents across every chat platform,
            with persistent memory, autonomous scheduling, and extensible skills.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/agents"
              className="glow-button px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com/morningstarnasser/NexusMind"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-all flex items-center gap-2"
            >
              <Github className="w-5 h-5" /> View on GitHub
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-2.5 rounded-full bg-slate-500" />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  QUICK START                                                  */}
      {/* ============================================================ */}
      <Section id="quickstart" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-2">Quick Start</h2>
          <p className="text-slate-400 text-center mb-10">Get up and running in under a minute.</p>

          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              {installTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-900/50'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code block */}
            {installTabs.map((tab) => (
              <div
                key={tab.id}
                className={`relative p-6 ${activeTab === tab.id ? 'block' : 'hidden'}`}
              >
                <CopyButton text={tab.code} />
                <pre className="font-mono text-sm leading-relaxed overflow-x-auto">
                  {tab.code.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="text-emerald-500 select-none mr-3">$</span>
                      <span className="text-slate-200">{line}</span>
                    </div>
                  ))}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  FEATURES                                                     */}
      {/* ============================================================ */}
      <Section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-2">What It Does</h2>
          <p className="text-slate-400 text-center mb-14">
            Everything you need for autonomous AI agents, out of the box.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  WORKS WITH EVERYTHING                                        */}
      {/* ============================================================ */}
      <Section className="py-24 px-6 bg-slate-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Works With Everything</h2>
          <p className="text-slate-400 mb-12">
            30+ integrations across chat, AI models, smart home, and more.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {topIntegrations.map((name) => (
              <div
                key={name}
                className="px-5 py-2.5 rounded-lg border border-slate-800 bg-slate-900/70 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
              >
                {name}
              </div>
            ))}
          </div>

          <Link
            href="/integrations"
            className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            View all 30+ integrations <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  ARCHITECTURE                                                 */}
      {/* ============================================================ */}
      <Section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-2">Architecture</h2>
          <p className="text-slate-400 text-center mb-14">
            Modular, extensible, built for production.
          </p>

          <div className="flex flex-col items-center gap-4">
            {/* Core */}
            <div className="w-full max-w-sm p-4 rounded-xl border border-blue-500/30 bg-blue-600/10 text-center">
              <p className="text-xs text-blue-400 font-medium uppercase tracking-wide mb-1">Core</p>
              <p className="text-white font-semibold">NexusMind Engine</p>
              <p className="text-xs text-slate-400 mt-1">Memory &middot; Skills &middot; Heartbeat &middot; LLM Router</p>
            </div>

            <div className="w-px h-8 bg-slate-700" />

            {/* Gateway */}
            <div className="w-full max-w-md p-4 rounded-xl border border-purple-500/30 bg-purple-600/10 text-center">
              <p className="text-xs text-purple-400 font-medium uppercase tracking-wide mb-1">Gateway</p>
              <p className="text-white font-semibold">Message Gateway</p>
              <p className="text-xs text-slate-400 mt-1">Routing &middot; Rate Limiting &middot; Auth &middot; Webhooks</p>
            </div>

            <div className="w-px h-8 bg-slate-700" />

            {/* Adapters */}
            <div className="w-full max-w-lg p-4 rounded-xl border border-emerald-500/30 bg-emerald-600/10 text-center">
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide mb-1">Adapters</p>
              <p className="text-white font-semibold">Platform Adapters</p>
              <p className="text-xs text-slate-400 mt-1">Telegram &middot; Discord &middot; Slack &middot; WhatsApp &middot; +7 more</p>
            </div>

            <div className="w-px h-8 bg-slate-700" />

            {/* Platforms */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
              {['Chat Apps', 'AI Models', 'Smart Home', 'DevOps'].map((cat) => (
                <div key={cat} className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 text-center">
                  <p className="text-xs font-medium text-slate-300">{cat}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  CTA                                                          */}
      {/* ============================================================ */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to deploy your AI?
          </h2>
          <p className="text-slate-400 mb-10">
            Install NexusMind in seconds and start building autonomous agents.
          </p>

          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl border border-slate-800 bg-slate-950 font-mono text-sm mb-8">
            <span className="text-emerald-500">$</span>
            <span className="text-slate-200">npm i -g nexusmind</span>
            <CopyButton text="npm i -g nexusmind" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/agents"
              className="glow-button px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/integrations"
              className="px-8 py-3 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-all"
            >
              Browse Integrations
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
