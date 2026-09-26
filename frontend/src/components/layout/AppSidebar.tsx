import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Database,
  Eye,
  PenTool,
  Boxes,
  FlaskConical,
  BarChart3,
  GitMerge,
  Heart,
  Rocket,
  Settings,
  Cpu,
  FileText
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Datasets', path: '/datasets', icon: Database },
  { name: 'Viewer', path: '/viewer', icon: Eye },
  { name: 'Annotations', path: '/annotations', icon: PenTool },
  { name: 'Models', path: '/models', icon: Boxes },
  { name: 'Experiments', path: '/experiments', icon: FlaskConical },
  { name: 'Benchmarks', path: '/benchmarks', icon: BarChart3 },
  { name: 'Optimization', path: '/optimization', icon: GitMerge },
  { name: 'Cardiac Profile', path: '/cardiac-profile', icon: Heart },
  { name: 'Deployments', path: '/deployments', icon: Rocket },
  { name: 'Inference', path: '/inference', icon: Cpu },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const AppSidebar: React.FC = () => {
  return (
    <aside className="w-60 border-r border-border bg-card/40 backdrop-blur-md flex flex-col shrink-0 select-none">
      <div className="p-4 border-b border-border/50">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Vertical Navigation
        </p>
        <p className="text-xs font-medium text-foreground mt-0.5 truncate">
          Cardiac MRI AI
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50 text-[11px] text-muted-foreground text-center">
        <p className="font-mono">TRL-4/5 Research Demo</p>
      </div>
    </aside>
  );
};
