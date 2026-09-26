import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, BarChart3, Cpu, Layers, TrendingUp, Info } from 'lucide-react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ExperimentRow {
  id: string;
  name: string;
  architecture: string;
  architecture_name: string;
  model_version: string;
  status: string;
  epochs_total: number;
  best_epoch: number | null;
  best_val_dice: number | null;
  best_val_iou: number | null;
  hardware: string | null;
  created_at: string | null;
}

interface EpochPoint {
  epoch: number;
  train_loss: number;
  val_loss: number;
  val_dice: number;
  val_iou: number;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-400 bg-green-500/10 border-green-500/20',
  running: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  failed: 'text-red-400 bg-red-500/10 border-red-500/20',
  queued: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const ARCH_COLORS: Record<string, string> = {
  UNet: '#6366f1',
  'U-Net': '#6366f1',
  BasicUNetPlusPlus: '#22d3ee',
  'U-Net++': '#22d3ee',
  EfficientUNet: '#f59e0b',
  'Efficient-UNet': '#f59e0b',
  SegResNet: '#a78bfa',
};

const TRAINING_CONFIG = [
  { label: 'Loss Function', value: 'DiceCELoss (α=0.5)' },
  { label: 'Optimizer', value: 'AdamW (lr=1e-4, wd=1e-5)' },
  { label: 'LR Schedule', value: 'CosineAnnealingLR (T_max=100)' },
  { label: 'Batch Size', value: '8 slices per step' },
  { label: 'Epochs', value: '100 (early stop patience=15)' },
  { label: 'Augmentation', value: 'Random flip, rotation ±15°, intensity jitter' },
  { label: 'Input Size', value: '1×160×160 (2D slice)' },
  { label: 'Framework', value: 'PyTorch 2.8 + MONAI 1.5' },
];

export const ExperimentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'runs' | 'curves' | 'config'>('runs');
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [epochData, setEpochData] = useState<EpochPoint[]>([]);
  const [loadingEpochs, setLoadingEpochs] = useState(false);

  useEffect(() => {
    axios.get('/api/v1/experiments').then(r => {
      setExperiments(r.data);
      if (r.data.length > 0) setSelectedExpId(r.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedExpId) return;
    setLoadingEpochs(true);
    axios.get(`/api/v1/experiments/${selectedExpId}/epochs`).then(r => {
      setEpochData(r.data);
    }).catch(() => setEpochData([])).finally(() => setLoadingEpochs(false));
  }, [selectedExpId]);

  const selectedExp = experiments.find(e => e.id === selectedExpId);
  const archColor = selectedExp ? (ARCH_COLORS[selectedExp.architecture] ?? '#6366f1') : '#6366f1';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
            <span>Experiments</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Training run history, epoch metrics, and loss/Dice curves.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['runs', 'curves', 'config'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px capitalize ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'runs' ? 'Training Runs' : tab === 'curves' ? 'Training Curves' : 'Training Config'}
          </button>
        ))}
      </div>

      {activeTab === 'runs' && (
        <div className="space-y-4">
          {experiments.length === 0 ? (
            <div className="glass-panel rounded-xl border border-border p-10 text-center space-y-4">
              <FlaskConical className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-foreground">No experiments found</p>
              <p className="text-xs text-muted-foreground">Run seed_experiments.py to populate demo data.</p>
            </div>
          ) : (
            <div className="overflow-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/60">
                    {['Name', 'Architecture', 'Status', 'Best Epoch', 'Best Val Dice', 'Best Val IoU', 'Hardware'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {experiments.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => { setSelectedExpId(row.id); setActiveTab('curves'); }}
                      className="border-b border-border/40 hover:bg-card/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono" style={{ color: ARCH_COLORS[row.architecture] ?? '#999' }}>
                          {row.architecture}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${STATUS_COLORS[row.status] ?? ''}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{row.best_epoch ?? '—'} / {row.epochs_total}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                        {row.best_val_dice?.toFixed(3) ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">{row.best_val_iou?.toFixed(3) ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.hardware ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link to="/benchmarks" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> View Benchmark Results
            </Link>
            <span>·</span>
            <Link to="/models" className="text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Browse Model Zoo
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'curves' && (
        <div className="space-y-4">
          {/* Experiment Selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground shrink-0">Experiment:</label>
            <select
              value={selectedExpId ?? ''}
              onChange={e => setSelectedExpId(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg max-w-xs"
            >
              {experiments.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {loadingEpochs ? (
            <div className="glass-panel p-10 rounded-xl border border-border text-center text-xs text-muted-foreground">
              Loading epoch metrics…
            </div>
          ) : epochData.length === 0 ? (
            <div className="glass-panel p-10 rounded-xl border border-border text-center text-xs text-muted-foreground">
              No epoch data available.
            </div>
          ) : (
            <>
              {/* Loss Curves */}
              <div className="glass-panel p-5 rounded-xl border border-border space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Loss Curves (Train / Val)
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={epochData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="epoch"
                      tick={{ fontSize: 10, fill: '#888' }}
                      label={{ value: 'Epoch', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#666' }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={[0, 0.8]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', fontSize: 11 }}
                      formatter={(v: number) => v.toFixed(4)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="train_loss" stroke={archColor} strokeWidth={1.5} dot={false} name="Train Loss" />
                    <Line type="monotone" dataKey="val_loss" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Val Loss" strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Dice Curve */}
              <div className="glass-panel p-5 rounded-xl border border-border space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Validation Dice over Epochs
                </h3>
                {selectedExp && (
                  <p className="text-[11px] text-muted-foreground">
                    Best: <span className="text-emerald-400 font-semibold font-mono">{selectedExp.best_val_dice?.toFixed(3)}</span>
                    {' '}at epoch {selectedExp.best_epoch}
                  </p>
                )}
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={epochData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="epoch"
                      tick={{ fontSize: 10, fill: '#888' }}
                      label={{ value: 'Epoch', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#666' }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={[0.5, 1.0]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', fontSize: 11 }}
                      formatter={(v: number) => v.toFixed(4)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="val_dice" stroke="#22c55e" strokeWidth={2} dot={false} name="Val Dice" />
                    <Line type="monotone" dataKey="val_iou" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Val IoU" strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-foreground">Default Training Configuration</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Standard hyperparameters for all 2D cardiac MRI segmentation experiments.
              Configured in <code className="font-mono bg-card px-1 py-0.5 rounded">configs/training/cardiac_mri_default.yaml</code>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TRAINING_CONFIG.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between bg-card/60 rounded-lg px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                  <span className="text-[11px] font-mono font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Data Integrity Guarantees</h2>
            </div>
            {[
              'Patient-level splits — no subject appears in more than one split',
              'Split assignments validated before every training run',
              'Dataset version pinned per experiment for full reproducibility',
              'Synthetic data never mixed with real ACDC metrics',
            ].map(item => (
              <div key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
