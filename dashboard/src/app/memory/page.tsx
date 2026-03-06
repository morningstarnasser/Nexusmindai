'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Database, Brain, BarChart3, Trash2, Plus } from 'lucide-react';

const memoryStats = [
  { label: 'Total Entries', value: '12.4K', icon: Database },
  { label: 'Used Storage', value: '2.3 GB', icon: BarChart3 },
  { label: 'Indexed Vectors', value: '8.9K', icon: Brain },
];

const recentMemories = [
  {
    id: 1,
    type: 'user_preference',
    content: 'User prefers responses in bullet points',
    agent: 'Email Agent',
    timestamp: '2 hours ago',
  },
  {
    id: 2,
    type: 'conversation_history',
    content: 'Discussion about project timeline and milestones',
    agent: 'Slack Agent',
    timestamp: '4 hours ago',
  },
  {
    id: 3,
    type: 'knowledge_base',
    content: 'Company product specifications and features',
    agent: 'Discord Agent',
    timestamp: '1 day ago',
  },
  {
    id: 4,
    type: 'user_profile',
    content: 'VIP customer - high priority support',
    agent: 'Email Agent',
    timestamp: '2 days ago',
  },
];

const getMemoryColor = (type: string) => {
  switch (type) {
    case 'user_preference':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'conversation_history':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'knowledge_base':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'user_profile':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};

export default function MemoryPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white">Memory</h1>
          <p className="text-slate-400 mt-2">Manage agent memories and knowledge bases</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Memory
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {memoryStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Icon className="w-4 h-4" /> {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Memory Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search memories by content, agent, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Memories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentMemories.map((memory) => (
            <div key={memory.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={`${getMemoryColor(memory.type)} border capitalize`}>
                    {memory.type.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-100">
                    {memory.agent}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-200 mb-2">{memory.content}</p>
              <p className="text-xs text-slate-500">{memory.timestamp}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Knowledge Graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
            <div className="text-center">
              <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Knowledge graph visualization coming soon</p>
              <p className="text-xs text-slate-500 mt-2">Shows connections between memories and agents</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
