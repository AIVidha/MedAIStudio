import React from 'react';
import { Eye } from 'lucide-react';

export const ViewerPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <Eye className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">NiiVue Medical Viewer</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">WebGL2 3D/4D NIfTI slice scroll, windowing, cine playback, and overlay visualization.</p>
      </div>
    </div>
  );
};
