import React from 'react';
import { Outlet } from 'react-router-dom';
import { ResearchBanner } from './ResearchBanner';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <ResearchBanner />
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto bg-background/50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
