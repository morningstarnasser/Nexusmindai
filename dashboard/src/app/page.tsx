'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle, CheckCircle2, Clock, Zap, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const dummyTokenData = [
  { time: '00:00', tokens: 1200 },
  { time: '04:00', tokens: 1900 },
  { time: '08:00', tokens: 2400 },
  { time: '12:00', tokens: 2210 },
  { time: '16:00', tokens: 2290 },
  { time: '20:00', tokens: 3200 },
  { time: '24:00', tokens: 3490 },
];

const dummyEvents = [
  { id: 1, type: 'agent_started', message: 'Email Agent started', time: '2 min ago' },
  { id: 2, type: 'workflow_completed', message: 'Customer Support Workflow completed (95% success)', time: '15 min ago' },
  { id: 3, type: 'agent_error', message: 'API Connection error in Discord Agent', time: '28 min ago' },
  { id: 4, type: 'skill_installed', message: 'New skill installed: Advanced Analytics', time: '1 hour ago' },
  { id: 5, type: 'agent_started', message: 'Slack Agent started', time: '2 hours ago' },
];

const dummyAgents = [
  { id: 1, name: 'Email Agent', status: 'healthy', platform: 'Email', messages: 342 },
  { id: 2, name: 'Slack Agent', status: 'healthy', platform: 'Slack', messages: 1256 },
  { id: 3, name: 'Discord Agent', status: 'warning', platform: 'Discord', messages: 89 },
  { id: 4, name: 'Telegram Agent', status: 'healthy', platform: 'Telegram', messages: 512 },
];

export default function Dashboard() {
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [heartbeat, setHeartbeat] = useState<number>(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeartbeat((prev) => (prev <= 1 ? 10 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'agent_started':
        return 'from-emerald-500/20 to-emerald-500/5';
      case 'workflow_completed':
        return 'from-blue-500/20 to-blue-500/5';
      case 'agent_error':
        return 'from-red-500/20 to-red-500/5';
      case 'skill_installed':
        return 'from-purple-500/20 to-purple-500/5';
      default:
        return 'from-slate-500/20 to-slate-500/5';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-2">System Overview & Activity</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Zap className="w-4 h-4 mr-2" /> Quick Actions
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${systemStatus === 'healthy' ? 'bg-emerald-500' : systemStatus === 'warning' ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-2xl font-bold text-white capitalize">{systemStatus}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">All systems operational</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{dummyAgents.length}</div>
            <p className="text-xs text-slate-500 mt-2">3 healthy, 1 warning</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Tokens Used (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">24.3K</div>
            <p className="text-xs text-slate-500 mt-2">of 100K monthly limit</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Next Heartbeat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400 font-mono">{heartbeat}s</div>
            <p className="text-xs text-slate-500 mt-2">Health check cycle</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Token Usage (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dummyTokenData}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="tokens" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTokens)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
              <Activity className="w-4 h-4 mr-2" /> Start New Agent
            </Button>
            <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
              <Zap className="w-4 h-4 mr-2" /> Run Workflow
            </Button>
            <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
              <Clock className="w-4 h-4 mr-2" /> View Logs
            </Button>
            <Button variant="outline" className="w-full justify-start bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
              <TrendingUp className="w-4 h-4 mr-2" /> Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dummyEvents.map((event) => (
              <div key={event.id} className={`p-3 rounded-lg bg-gradient-to-r ${getEventColor(event.type)} border border-slate-700`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{event.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{event.time}</p>
                  </div>
                  <Activity className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Active Agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dummyAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-100">{agent.name}</p>
                  <p className="text-xs text-slate-500">{agent.messages} messages</p>
                </div>
                <Badge className={`${getStatusColor(agent.status)} border`}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(agent.status)}
                    {agent.status}
                  </span>
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
