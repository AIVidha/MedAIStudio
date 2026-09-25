import React from 'react';
import { Settings } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3">
        <Settings className="w-6 h-6 text-muted-foreground" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Settings & Governance</h1>
      </div>
      <div className="glass-panel p-6 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">Data retention rules, DICOM de-identification settings, and audit logs.</p>
      </div>
    </div>
  );
};
