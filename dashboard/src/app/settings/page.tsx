'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Lock, Link2, AlertCircle, Check } from 'lucide-react';
import { useState } from 'react';

const providerConfig = [
  {
    name: 'OpenAI',
    type: 'LLM Provider',
    status: 'connected',
    icon: '🤖',
    apiKeyPrefix: 'sk-***',
  },
  {
    name: 'Pinecone',
    type: 'Vector Database',
    status: 'connected',
    icon: '📊',
    apiKeyPrefix: 'pcn-***',
  },
  {
    name: 'GitHub',
    type: 'Repository',
    status: 'disconnected',
    icon: '🔗',
    apiKeyPrefix: 'ghp-***',
  },
];

const integrations = [
  {
    id: 1,
    name: 'Slack',
    status: 'connected',
    workspace: 'nexusmind.slack.com',
    lastSync: '2 min ago',
  },
  {
    id: 2,
    name: 'Discord',
    status: 'connected',
    workspace: 'NexusMind Server',
    lastSync: '5 min ago',
  },
  {
    id: 3,
    name: 'Telegram',
    status: 'connected',
    workspace: 'nexusmind_bot',
    lastSync: '1 min ago',
  },
  {
    id: 4,
    name: 'Gmail',
    status: 'disconnected',
    workspace: 'Not connected',
    lastSync: 'Never',
  },
];

const securitySettings = [
  {
    id: 1,
    name: 'Two-Factor Authentication',
    enabled: true,
    description: 'Protect your account with 2FA',
  },
  {
    id: 2,
    name: 'API Key Rotation',
    enabled: false,
    description: 'Automatically rotate API keys every 30 days',
  },
  {
    id: 3,
    name: 'Activity Logging',
    enabled: true,
    description: 'Log all administrative actions',
  },
  {
    id: 4,
    name: 'IP Whitelist',
    enabled: false,
    description: 'Restrict access to specific IP addresses',
  },
];

export default function SettingsPage() {
  const [securityConfig, setSecurityConfig] = useState<Record<number, boolean>>(
    securitySettings.reduce((acc, setting) => ({ ...acc, [setting.id]: setting.enabled }), {})
  );

  const toggleSecurity = (id: number) => {
    setSecurityConfig((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-2">Manage configuration and integrations</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Model Provider Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerConfig.map((provider, idx) => (
            <div key={idx} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <p className="font-semibold text-white">{provider.name}</p>
                    <p className="text-xs text-slate-500">{provider.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`${provider.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400'} border capitalize`}>
                    {provider.status}
                  </Badge>
                  <span className="text-xs text-slate-500">{provider.apiKeyPrefix}</span>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-100">
                    {provider.status === 'connected' ? 'Update' : 'Connect'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Platform Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold text-white">{integration.name}</p>
                    <Badge className={`${integration.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400'} border capitalize text-xs`}>
                      {integration.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">{integration.workspace}</p>
                  <p className="text-xs text-slate-600 mt-1">Last sync: {integration.lastSync}</p>
                </div>
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-100">
                  {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {securitySettings.map((setting) => (
            <div key={setting.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-white">{setting.name}</p>
                <p className="text-sm text-slate-400">{setting.description}</p>
              </div>
              <button
                onClick={() => toggleSecurity(setting.id)}
                className={`relative w-12 h-7 rounded-full transition-colors ${securityConfig[setting.id] ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${securityConfig[setting.id] ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-red-500/10 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-sm text-slate-200 mb-3">Reset all configuration to factory defaults. This cannot be undone.</p>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              Reset Configuration
            </Button>
          </div>
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-sm text-slate-200 mb-3">Delete all data and remove the system. This is permanent.</p>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              Delete All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
