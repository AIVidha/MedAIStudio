import React from 'react';
import { Sun, Moon, LogOut, Activity, Database } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export const AppHeader: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-primary">
          <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
          <span className="font-bold text-lg tracking-tight text-foreground">MedAI Studio</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
          v0.1.0-prototype
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Project & Dataset Selectors */}
        <div className="flex items-center space-x-2 bg-secondary/50 px-3 py-1 rounded-md text-xs font-mono border border-border">
          <Database className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Active Project:</span>
          <span className="font-semibold text-foreground">Cardiac MRI AI Demo</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Profile / Logout */}
        {user && (
          <div className="flex items-center space-x-3 border-l border-border pl-4">
            <div className="text-right">
              <p className="text-xs font-medium text-foreground">{user.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
