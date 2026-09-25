import React from 'react';
import { Rocket } from 'lucide-react';

export const DeploymentsPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <Rocket className="w-6 h-6 text-green-400" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">ONNX Deployment Demo</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">ONNX Runtime containerized deployment endpoint, status monitoring, curl example, and live test panel.</p>
      </div>
    </div>
  );
};
