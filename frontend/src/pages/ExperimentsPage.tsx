import React from 'react';
import { FlaskConical } from 'lucide-react';

export const ExperimentsPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <FlaskConical className="w-6 h-6 text-pink-400" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Experiment Tracking</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">Training runs, hyperparameter configs, epoch curves, and checkpoints.</p>
      </div>
    </div>
  );
};
