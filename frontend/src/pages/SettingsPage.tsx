import React, { useState } from 'react';
import { Settings, Shield, Database, BookOpen, Key, Info, Copy, Check } from 'lucide-react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between bg-card/60 rounded-lg px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
        {mono && <CopyButton text={value} />}
      </div>
    </div>
  );
}

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'governance' | 'credentials' | 'about'>('governance');

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span>Settings</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Data governance, demo credentials, and platform information.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['governance', 'credentials', 'about'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px capitalize ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'governance' ? 'Data Governance' : tab === 'credentials' ? 'Demo Access' : 'About'}
          </button>
        ))}
      </div>

      {activeTab === 'governance' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-semibold text-foreground">Privacy & Execution Model</h2>
            </div>
            <div className="space-y-2">
              {[
                ['Execution', 'Local only — no external API calls or cloud inference'],
                ['Telemetry', 'None — no usage data transmitted anywhere'],
                ['Network', 'Frontend ↔ Backend over localhost only'],
                ['Patient Data', 'ACDC public dataset (CC BY-NC-SA 4.0) and synthetic fallback only'],
                ['Storage', 'SQLite DB and NIfTI files on local disk only'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-3 text-xs">
                  <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{label}:</span> {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Git Safety Rules</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              The following paths are never committed to version control:
            </p>
            <div className="space-y-1">
              {['data/raw/', 'data/processed/', 'storage/', '*.pt', '*.pth', '*.onnx'].map(path => (
                <div key={path} className="flex items-center gap-2 bg-card/60 rounded px-3 py-1.5">
                  <span className="text-[11px] font-mono text-red-400">✗</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{path}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-foreground">Clinical Safety Rules</h2>
            </div>
            {[
              'Persistent banner on every page: "Research prototype — not for clinical use."',
              'All quantitative outputs: "Research / AI-derived quantitative measurements — not clinical diagnosis."',
              'All classifier outputs: "Research classification output (ACDC challenge categories) — not a diagnosis."',
              'Terms "diagnosis", "diagnose", "patient has" are never used in subject outputs.',
              'No treatment advice or clinical decision support of any kind.',
            ].map(rule => (
              <div key={rule} className="flex items-start gap-2 text-xs">
                <Shield className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'credentials' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Demo Credentials</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Created by <code className="font-mono bg-card px-1 py-0.5 rounded">python scripts/seed_demo.py</code>.
              For local development use only.
            </p>
            <div className="space-y-2">
              <Row label="Email" value="admin@medaistudio.local" mono />
              <Row label="Password" value="admin123" mono />
              <Row label="Role" value="admin" />
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-300">
                These are demo-only credentials for a local development environment. Never use in production.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">API Access</h2>
            <div className="space-y-2">
              <Row label="Backend URL" value="http://localhost:8000" mono />
              <Row label="API Docs" value="http://localhost:8000/docs" mono />
              <Row label="ReDoc" value="http://localhost:8000/redoc" mono />
              <Row label="OpenAPI Schema" value="http://localhost:8000/openapi.json" mono />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">MedAI Studio</h2>
            <div className="space-y-2">
              <Row label="Version" value="0.1.0-alpha" />
              <Row label="Maturity" value="TRL-4 / TRL-5 Research Prototype" />
              <Row label="Primary Vertical" value="Cardiac MRI Segmentation" />
              <Row label="Frontend" value="React 18 + Vite + Tailwind CSS" />
              <Row label="Backend" value="FastAPI + Pydantic v2 + SQLAlchemy 2" />
              <Row label="Viewer" value="NiiVue WebGL2 (niivue/niivue)" />
              <Row label="ML Framework" value="PyTorch 2.8 + MONAI 1.5" />
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-foreground">ACDC Dataset Citation (Mandatory)</h2>
            </div>
            <div className="bg-card/60 rounded-lg p-4 font-mono text-[11px] text-muted-foreground leading-relaxed space-y-1">
              <p>Bernard, O., Lalande, A., Zotti, C., et al. (2018).</p>
              <p className="text-foreground">Deep Learning Techniques for Automatic MRI Cardiac Multi-Structures</p>
              <p className="text-foreground">Segmentation and Diagnosis: Is the Problem Solved?</p>
              <p className="mt-1">IEEE Transactions on Medical Imaging, 37(11), 2514–2525.</p>
              <p>DOI: 10.1109/TMI.2018.2837502</p>
              <p className="mt-1 text-amber-400">License: CC BY-NC-SA 4.0</p>
            </div>
            <CopyButton text="Bernard, O., Lalande, A., Zotti, C., et al. (2018). Deep Learning Techniques for Automatic MRI Cardiac Multi-Structures Segmentation and Diagnosis: Is the Problem Solved? IEEE Transactions on Medical Imaging, 37(11), 2514-2525. DOI: 10.1109/TMI.2018.2837502" />
          </div>

          <div className="glass-panel rounded-xl border border-border p-5 space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Disclaimer</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              MedAI Studio is a research prototype at TRL-4/5. It is intended for research, academic,
              and technology demonstration purposes only. It is not a certified medical device,
              not validated for clinical use, and must not be used for clinical decision making,
              diagnosis, or treatment planning. All outputs are research measurements only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
