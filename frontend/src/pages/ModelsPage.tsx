import React from 'react';
import { Boxes } from 'lucide-react';

export const ModelsPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <Boxes className="w-6 h-6 text-amber-400" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Model Zoo & Registry</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">Architectures (U-Net, U-Net++, Efficient-UNet, SegResNet) & Model Versions.</p>
      </div>
    </div>
  );
};
