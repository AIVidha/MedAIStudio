import React from 'react';
import { Heart } from 'lucide-react';

export const CardiacProfilePage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <Heart className="w-6 h-6 text-red-400" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Cardiac AI Profile</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">LV/RV EDV, ESV, EF, stroke volume, myocardial mass & research category classification probabilities.</p>
      </div>
    </div>
  );
};
