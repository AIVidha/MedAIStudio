import React from 'react';
import { FolderKanban } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <FolderKanban className="w-6 h-6 text-blue-400" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Projects</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">Manage active projects and vertical configurations.</p>
      </div>
    </div>
  );
};
