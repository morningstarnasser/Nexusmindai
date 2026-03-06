'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const tokenData = [
  { day: 'Mon', tokens: 4200, cost: 21 },
  { day: 'Tue', tokens: 5100, cost: 25.5 },
  { day: 'Wed', tokens: 4800, cost: 24 },
  { day: 'Thu', tokens: 6200, cost: 31 },
  { day: 'Fri', tokens: 7100, cost: 35.5 },
  { day: 'Sat', tokens: 5900, cost: 29.5 },
  { day: 'Sun', tokens: 4100, cost: 20.5 },
];

const messageVolumeData = [
  { agent: 'Email', messages: 2400 },
  { agent: 'Slack', messages: 3210 },
  { agent: 'Discord', messages: 1200 },
  { agent: 'Telegram', messages: 2290 },
];

const costBreakdownData = [
  { name: 'API Calls', value: 45, color: '#3b82f6' },
  { name: 'Storage', value: 25, color: '#8b5cf6' },
  { name: 'Compute', value: 20, color: '#ec4899' },
  { name: 'Other', value: 10, color: '#f59e0b' },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-2">Usage metrics and cost tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Tokens This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">34.4K</div>
            <div className="flex items-center gap-1 mt-2 text-sm text-emerald-400">
              <TrendingUp className="w-4 h-4" /> +12% from last week
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Cost This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">$172.50</div>
            <div className="flex items-center gap-1 mt-2 text-sm text-amber-400">
              <TrendingUp className="w-4 h-4" /> +8% from last week
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Avg Cost/1K Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">$0.005</div>
            <div className="flex items-center gap-1 mt-2 text-sm text-emerald-400">
              <TrendingDown className="w-4 h-4" /> -2% improvement
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Budget Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">34.5%</div>
            <div className="text-xs text-slate-500 mt-2">$1,725 of $5,000 monthly</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Token Usage & Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tokenData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis yAxisId="left" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Line yAxisId="left" type="monotone" dataKey="tokens" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={costBreakdownData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {costBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {costBreakdownData.map((item) => (
                <div key={item.name} className="flex justify-between text-sm">
                  <span className="text-slate-400">{item.name}</span>
                  <span className="text-white font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Message Volume by Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={messageVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="agent" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="messages" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
