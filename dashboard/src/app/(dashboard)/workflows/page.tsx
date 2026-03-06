'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const workflows = [
  {
    id: 1,
    name: 'Customer Support Workflow',
    status: 'active',
    lastRun: '2024-01-15 10:32 AM',
    successRate: 95,
    runCount: 342,
    nextRun: 'In 4 hours',
  },
  {
    id: 2,
    name: 'Email Triage Pipeline',
    status: 'active',
    lastRun: '2024-01-15 09:15 AM',
    successRate: 98,
    runCount: 1256,
    nextRun: 'In 2 hours',
  },
  {
    id: 3,
    name: 'Daily Report Generation',
    status: 'paused',
    lastRun: '2024-01-14 08:00 AM',
    successRate: 99,
    runCount: 89,
    nextRun: 'Tomorrow',
  },
  {
    id: 4,
    name: 'Social Media Monitoring',
    status: 'active',
    lastRun: '2024-01-15 10:45 AM',
    successRate: 92,
    runCount: 512,
    nextRun: 'In 30 mins',
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'paused':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'error':
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};

const getSuccessColor = (rate: number) => {
  if (rate >= 95) return 'text-emerald-400';
  if (rate >= 85) return 'text-amber-400';
  return 'text-red-400';
};

export default function WorkflowsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white">Workflows</h1>
          <p className="text-slate-400 mt-2">Manage automated task sequences</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Create Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-white">{workflow.name}</h3>
                    <Badge className={`${getStatusColor(workflow.status)} border capitalize`}>
                      {workflow.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Last Run</p>
                      <p className="text-sm text-slate-100 mt-1">{workflow.lastRun}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Success Rate</p>
                      <p className={`text-sm font-bold mt-1 ${getSuccessColor(workflow.successRate)}`}>
                        {workflow.successRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Total Runs</p>
                      <p className="text-sm text-slate-100 mt-1">{workflow.runCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Next Run</p>
                      <p className="text-sm text-slate-100 mt-1">{workflow.nextRun}</p>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${workflow.successRate}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-6">
                  <Button size="sm" variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
                    <Pause className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Total Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">2.2K</p>
            <p className="text-xs text-slate-500 mt-2">This month</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Avg Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">96.1%</p>
            <p className="text-xs text-slate-500 mt-2">Across all workflows</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">2m 34s</p>
            <p className="text-xs text-slate-500 mt-2">Per execution</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
