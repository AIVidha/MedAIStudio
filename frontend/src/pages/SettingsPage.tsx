import React, { useState, useEffect } from 'react';
import {
  Settings, Shield, Database, BookOpen, Key, Info, Copy, Check,
  Wifi, WifiOff, RefreshCw, Server, Monitor, Bell, Eye,
} from 'lucide-react';
import axios from 'axios';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="text-muted-foreground hover:text-foreground transition-colors" title="Copy">
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

function Toggle({ label, desc, value, onChange }: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {desc && <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${value ? 'bg-emerald-600' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

// Preference keys stored in localStorage
const PREF_KEYS = {
  compactMode: 'medai_compact_mode',
  autoCompute: 'medai_auto_compute',
  notifications: 'medai_notifications',
  showRawVoxels: 'medai_show_raw_voxels',
  highContrast: 'medai_high_contrast',
  autoRotate3D: 'medai_auto_rotate_3d',
};

function loadPref(key: string, def: boolean): boolean {
  try { const v = localStorage.getItem(key); return v === null ? def : v === 'true'; } catch { return def; }
}
function savePref(key: string, val: boolean) {
  try { localStorage.setItem(key, String(val)); } catch {}
}

interface BackendStatus {
  status: 'checking' | 'online' | 'offline';
  version?: string;
  db?: string;
  latency?: number;
}

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'preferences' | 'governance' | 'about'>('system');

  // Backend health
  const [backend, setBackend] = useState<BackendStatus>({ status: 'checking' });

  // Preferences
  const [prefs, setPrefs] = useState({
    compactMode:   loadPref(PREF_KEYS.compactMode,   false),
    autoCompute:   loadPref(PREF_KEYS.autoCompute,   true),
    notifications: loadPref(PREF_KEYS.notifications, true),
    showRawVoxels: loadPref(PREF_KEYS.showRawVoxels, false),
    highContrast:  loadPref(PREF_KEYS.highContrast,  false),
    autoRotate3D:  loadPref(PREF_KEYS.autoRotate3D,  true),
  });

  const setPref = (key: keyof typeof prefs) => (val: boolean) => {
    setPrefs(p => ({ ...p, [key]: val }));
    savePref(PREF_KEYS[key], val);
  };

  const checkBackend = async () => {
    setBackend({ status: 'checking' });
    const t0 = Date.now();
    try {
      const r = await axios.get('/api/v1/health', { timeout: 4000 });
      setBackend({ status: 'online', version: r.data?.version, db: r.data?.db, latency: Date.now() - t0 });
    } catch {
      // Try minimal ping
      try {
        await axios.get('/api/v1/projects', { timeout: 4000 });
        setBackend({ status: 'online', latency: Date.now() - t0 });
      } catch {
        setBackend({ status: 'offline' });
      }
    }
  };

  useEffect(() => { checkBackend(); }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span>Settings</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">System health, preferences, governance, and platform info.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'system',      label: 'System Status' },
          { id: 'preferences', label: 'Preferences'   },
          { id: 'governance',  label: 'Governance'    },
          { id: 'about',       label: 'About'         },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── System Status ── */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          {/* Backend health card */}
          <div className="glass-panel rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-foreground">Backend API</h2>
              </div>
              <button onClick={checkBackend}
                className="flex items-center gap-1.5 px-3 py-1 text-xs border border-border rounded-lg hover:bg-card/60 transition-colors">
                <RefreshCw className={`w-3 h-3 ${backend.status === 'checking' ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-3">
              {backend.status === 'checking' ? (
                <><span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-amber-300">Checking…</span></>
              ) : backend.status === 'online' ? (
                <><Wifi className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">Online</span>
                  {backend.latency && <span className="text-[10px] text-muted-foreground font-mono">{backend.latency} ms</span>}</>
              ) : (
                <><WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">Offline</span>
                  <span className="text-[10px] text-muted-foreground">Is the FastAPI server running on port 8000?</span></>
              )}
            </div>

            <div className="space-y-2">
              <Row label="Backend URL"    value="http://localhost:8000" mono />
              <Row label="API Docs"       value="http://localhost:8000/docs" mono />
              <Row label="Status"
                value={backend.status === 'online' ? '✓ Reachable' : backend.status === 'checking' ? '…' : '✗ Unreachable'} />
              {backend.latency && <Row label="Round-trip latency" value={`${backend.latency} ms`} mono />}
            </div>
          </div>

          {/* Services */}
          <div className="glass-panel rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-foreground">Local Services</h2>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Frontend (Vite dev)', port: 3000, expected: 'Running' },
                { label: 'FastAPI backend',     port: 8000, expected: backend.status === 'online' ? 'Online' : 'Check terminal' },
                { label: 'ONNX Container',      port: 8001, expected: 'Not started (optional)' },
              ].map(({ label, port, expected }) => (
                <div key={port} className="flex justify-between items-center bg-card/60 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-foreground">:{port}</span>
                    <span className="text-[10px] text-muted-foreground">{expected}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demo credentials */}
          <div className="glass-panel rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Demo Credentials</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Created by <code className="font-mono bg-card px-1 py-0.5 rounded">python scripts/seed_demo.py</code>
            </p>
            <div className="space-y-2">
              <Row label="Email"    value="admin@medaistudio.local" mono />
              <Row label="Password" value="admin123"                mono />
              <Row label="Role"     value="admin" />
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-300">Local development only. Never use in production.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Preferences ── */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl border border-border p-5 space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-foreground">Display</h2>
            </div>
            <Toggle label="Compact mode"
              desc="Reduce padding and font sizes across all pages"
              value={prefs.compactMode} onChange={setPref('compactMode')} />
            <Toggle label="High contrast overlays"
              desc="Use higher-opacity annotation overlays in the viewer"
              value={prefs.highContrast} onChange={setPref('highContrast')} />
            <Toggle label="Show raw voxel counts"
              desc="Display raw NIfTI voxel counts alongside physical volume measurements"
              value={prefs.showRawVoxels} onChange={setPref('showRawVoxels')} />
            <Toggle label="3D heart auto-rotate"
              desc="Rotate the 3D anatomical heart viewer automatically on load"
              value={prefs.autoRotate3D} onChange={setPref('autoRotate3D')} />
          </div>

          <div className="glass-panel rounded-xl border border-border p-5 space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Behaviour</h2>
            </div>
            <Toggle label="Auto-compute on subject change"
              desc="Automatically run cardiac quantification when a new subject is selected"
              value={prefs.autoCompute} onChange={setPref('autoCompute')} />
            <Toggle label="In-app notifications"
              desc="Show toast notifications for completed benchmark runs and experiments"
              value={prefs.notifications} onChange={setPref('notifications')} />
          </div>

          <div className="px-4 py-3 rounded-xl border border-border/40 bg-card/20 text-[10px] text-muted-foreground flex items-start gap-2">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" />
            Preferences are saved to your browser's localStorage and persist across sessions on this device.
            They do not sync to the backend.
          </div>
        </div>
      )}

      {/* ── Governance ── */}
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
                ['Network',   'Frontend ↔ Backend over localhost only'],
                ['Patient Data', 'ACDC public dataset (CC BY-NC-SA 4.0) and synthetic fallback only'],
                ['Storage', 'SQLite DB and NIfTI files on local disk only'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-3 text-xs">
                  <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground"><span className="font-medium text-foreground">{label}:</span> {value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Git Safety Rules</h2>
            </div>
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
              <h2 className="text-sm font-semibold text-foreground">Clinical Safety Rules (non-negotiable)</h2>
            </div>
            {[
              'Persistent banner on every page: "Research prototype — not for clinical use."',
              'All quantitative outputs carry research / not clinical diagnosis disclaimer.',
              'Classifier outputs carry: "Research classification output — not a diagnosis."',
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

      {/* ── About ── */}
      {activeTab === 'about' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">MedAI Studio</h2>
            <div className="space-y-2">
              <Row label="Version"         value="0.1.0-alpha" />
              <Row label="Maturity"        value="TRL-4 / TRL-5 Research Prototype" />
              <Row label="Primary Vertical" value="Cardiac MRI Segmentation" />
              <Row label="Frontend"        value="React 18 + Vite + Tailwind CSS" />
              <Row label="Backend"         value="FastAPI + Pydantic v2 + SQLAlchemy 2" />
              <Row label="Viewer"          value="NiiVue WebGL2 (niivue/niivue)" />
              <Row label="ML Framework"    value="PyTorch 2.8 + MONAI 1.5" />
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-foreground">ACDC Dataset Citation (Mandatory)</h2>
              </div>
              <CopyButton text="Bernard, O., Lalande, A., Zotti, C., et al. (2018). Deep Learning Techniques for Automatic MRI Cardiac Multi-Structures Segmentation and Diagnosis: Is the Problem Solved? IEEE Transactions on Medical Imaging, 37(11), 2514-2525. DOI: 10.1109/TMI.2018.2837502" />
            </div>
            <div className="bg-card/60 rounded-lg p-4 font-mono text-[11px] text-muted-foreground leading-relaxed space-y-1">
              <p>Bernard, O., Lalande, A., Zotti, C., et al. (2018).</p>
              <p className="text-foreground">Deep Learning Techniques for Automatic MRI Cardiac Multi-Structures</p>
              <p className="text-foreground">Segmentation and Diagnosis: Is the Problem Solved?</p>
              <p className="mt-1">IEEE Transactions on Medical Imaging, 37(11), 2514–2525.</p>
              <p>DOI: 10.1109/TMI.2018.2837502</p>
              <p className="mt-1 text-amber-400">License: CC BY-NC-SA 4.0</p>
            </div>
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
