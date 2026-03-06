'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Download, Trash2, Check } from 'lucide-react';
import { useState } from 'react';

const skills = [
  {
    id: 1,
    name: 'Email Processing',
    version: '1.2.3',
    category: 'Communication',
    enabled: true,
    downloads: 1240,
    rating: 4.8,
    description: 'Process and categorize incoming emails automatically',
  },
  {
    id: 2,
    name: 'Natural Language Understanding',
    version: '2.1.0',
    category: 'AI',
    enabled: true,
    downloads: 3420,
    rating: 4.9,
    description: 'Advanced NLU for understanding user intent and context',
  },
  {
    id: 3,
    name: 'Data Analysis',
    version: '1.5.2',
    category: 'Analytics',
    enabled: false,
    downloads: 856,
    rating: 4.6,
    description: 'Analyze data and generate insights from datasets',
  },
  {
    id: 4,
    name: 'Calendar Management',
    version: '1.0.1',
    category: 'Productivity',
    enabled: true,
    downloads: 654,
    rating: 4.5,
    description: 'Schedule meetings and manage calendars across platforms',
  },
  {
    id: 5,
    name: 'Document Generation',
    version: '1.8.4',
    category: 'Automation',
    enabled: true,
    downloads: 2180,
    rating: 4.7,
    description: 'Generate documents in multiple formats automatically',
  },
  {
    id: 6,
    name: 'Web Scraping',
    version: '1.3.0',
    category: 'Data',
    enabled: false,
    downloads: 456,
    rating: 4.4,
    description: 'Extract structured data from web pages safely',
  },
];

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Communication: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    AI: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    Analytics: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Productivity: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Automation: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    Data: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  };
  return colors[category] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
};

export default function SkillsPage() {
  const [enabledSkills, setEnabledSkills] = useState<Record<number, boolean>>(
    skills.reduce((acc, skill) => ({ ...acc, [skill.id]: skill.enabled }), {})
  );

  const toggleSkill = (skillId: number) => {
    setEnabledSkills((prev) => ({ ...prev, [skillId]: !prev[skillId] }));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white">Skills</h1>
          <p className="text-slate-400 mt-2">Manage installed agent skills and capabilities</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Install Skill
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map((skill) => (
          <Card key={skill.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-lg">{skill.name}</CardTitle>
                  <Badge className={`mt-2 ${getCategoryColor(skill.category)} border capitalize`}>
                    {skill.category}
                  </Badge>
                </div>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">v{skill.version}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">{skill.description}</p>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{skill.downloads.toLocaleString()} downloads</span>
                <span className="text-amber-400">★ {skill.rating}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSkill(skill.id)}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                    enabledSkills[skill.id]
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  {enabledSkills[skill.id] ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-700">
                <Button size="sm" variant="ghost" className="flex-1 text-slate-400 hover:text-slate-200">
                  <Settings className="w-4 h-4 mr-1" /> Config
                </Button>
                <Button size="sm" variant="ghost" className="flex-1 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4 mr-1" /> Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Skill Marketplace</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-4">
            Discover and install additional skills from the NexusMind community marketplace.
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" /> Browse Marketplace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
