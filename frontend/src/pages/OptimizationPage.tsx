import React from 'react';
import { GitMerge } from 'lucide-react';

export const OptimizationPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <GitMerge className="w-6 h-6 text-indigo-400" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Pareto & MCDM Optimization</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">Non-dominated sorting frontier, TOPSIS multi-criteria decision making, and weight sensitivity analysis.</p>
      </div>
    </div>
  );
};
