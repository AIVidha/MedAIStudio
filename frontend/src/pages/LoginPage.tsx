import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ResearchBanner } from '../components/layout/ResearchBanner';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@medaistudio.local');
  const [password, setPassword] = useState('admin123');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <ResearchBanner />

      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Subtle Gradient Spheres */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full glass-panel rounded-2xl p-8 border border-border/80 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
              <Activity className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">MedAI Studio</h1>
            <p className="text-xs text-primary font-medium mt-1">
              Build. Annotate. Benchmark. Optimize. Deploy Medical AI.
            </p>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Institutional Medical AI Research & Benchmarking Platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="admin@medaistudio.local"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all mt-6"
            >
              <span>Sign In to Platform</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/60 text-center text-[11px] text-muted-foreground space-y-1">
            <p className="flex items-center justify-center space-x-1 font-medium text-amber-400/90">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Research prototype — not for clinical use.</span>
            </p>
            <p>Target Vertical: Cardiac MRI AI (ACDC Dataset)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
