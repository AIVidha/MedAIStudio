import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ResearchBanner: React.FC = () => {
  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 px-4 py-1.5 text-xs font-medium flex items-center justify-center space-x-2 select-none">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Research prototype — not for clinical use.</span>
    </div>
  );
};
