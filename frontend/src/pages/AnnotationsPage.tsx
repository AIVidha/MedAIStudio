import React from 'react';
import { PenTool } from 'lucide-react';

export const AnnotationsPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <PenTool className="w-6 h-6 text-amber-400" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Annotation Workspace</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">Brush, polygon, eraser, fill, undo/redo & AI-assisted segment editing.</p>
      </div>
    </div>
  );
};
