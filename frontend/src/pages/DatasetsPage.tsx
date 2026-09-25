import React from 'react';
import { Database } from 'lucide-react';

export const DatasetsPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <Database className="w-6 h-6 text-purple-400" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Datasets & Splits</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">ACDC Dataset import, synthetic generation, and patient-level leakage check.</p>
      </div>
    </div>
  );
};
