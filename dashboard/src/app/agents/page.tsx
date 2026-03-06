'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, MessageCircle, Mail, Send, Plus, MoreVertical } from 'lucide-react';

const agents = [
  {
    id: 1,
    name: 'Email Agent',
    status: 'healthy',
    platform: 'Email',
    icon: Mail,
    messages: 342,
    uptime: '99.8%',
    lastActivity: '2 min ago',
    description: 'Handles email inbox management and response automation',
  },
  {
    id: 2,
    name: 'Slack Agent',
    status: 'healthy',
    platform: 'Slack',
    icon: MessageCircle,
    messages: 1256,
    uptime: '99.9%',
    lastActivity: '1 min ago',
    description: 'Manages Slack channels and user interactions',
  },
  {
    id: 3,
    name: 'Discord Agent',
    status: 'warning',
    platform: 'Discord',
    icon: MessageSquare,
    messages: 89,
    uptime: '95.2%',
    lastActivity: '5 min ago',
    description: 'Moderates Discord communities and responds to queries',
  },
  {
    id: 4,
    name: 'Telegram Agent',
    status: 'healthy',
    platform: 'Telegram',
    icon: Send,
    messages: 512,
    uptime: '99.7%',
    lastActivity: '3 min ago',
    description: 'Sends notifications and handles bot commands',
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'warning':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'error':
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};

const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500';
    case 'warning':
      return 'bg-amber-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-slate-500';
  }
};

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white">Agents</h1>
          <p className="text-slate-400 mt-2">Manage and monitor your AI agents</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const IconComponent = agent.icon;
          return (
            <Card key={agent.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <IconComponent className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg">{agent.name}</CardTitle>
                      <p className="text-xs text-slate-500 mt-1">{agent.platform}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-400">{agent.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-500 font-medium">Messages Processed</p>
                    <p className="text-2xl font-bold text-white mt-1">{agent.messages}</p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-500 font-medium">Uptime</p>
                    <p className="text-2xl font-bold text-white mt-1">{agent.uptime}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor(agent.status)}`} />
                    <Badge className={`${getStatusColor(agent.status)} border`}>
                      {agent.status}
                    </Badge>
                    <span className="text-xs text-slate-500">{agent.lastActivity}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
                    Logs
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
                    Settings
                  </Button>
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    Restart
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Agent Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">
            Agents are AI-powered assistants that manage interactions across different platforms. Each agent can be configured with custom skills, memory, and behavior patterns.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
