import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, BarChart3, Cpu, Zap, Activity, ExternalLink, CheckCircle2, Clock, Tag } from 'lucide-react';
import axios from 'axios';

interface ModelVersion {
  id: string;
  architecture_id: string;
  version_tag: string;
  status: string;
  created_at: string | null;
}

interface Architecture {
  id: string;
  name: string;
  display_name: string;
  summary: string;
  num_parameters: number;
  flops: number;
  supported_inputs: Record<string, any>;
}

interface BenchmarkResult {
  model_name: string;
  mean_dice: number;
  lv_dice: number;
  rv_dice: number;
  myo_dice: number;
  mean_iou: number;
  model_size_mb: number;
  latency_median_ms: number;
  hardware: string;
  is_precomputed: boolean;
}

function formatParams(n: number): string {
  if (!n) return '—';
  return `${(n / 1_000_000).toFixed(1)}M`;
}

const ARCH_COLORS: Record<string, string> = {
  UNet: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  BasicUNetPlusPlus: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
  EfficientUNet: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
  SegResNet: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
};

const ARCH_DESCRIPTIONS: Record<string, { inputs: string; paper: string; highlights: string[] }> = {
  UNet: {
    inputs: '2D slice (1×160×160)',
    paper: 'Ronneberger et al., MICCAI 2015',
    highlights: ['Encoder–decoder with skip connections', 'Contracting & expansive paths', 'Standard cardiac MRI baseline'],
  },
  BasicUNetPlusPlus: {
    inputs: '2D slice (1×160×160)',
    paper: 'Zhou et al., DLMIA 2018',
    highlights: ['Dense nested skip connections', 'Re-designed skip pathways', 'Better fine structure capture'],
  },
  EfficientUNet: {
    inputs: '2D slice (1×160×160)',
    paper: 'EfficientNet-B0 backbone (Tan & Le, ICML 2019)',
    highlights: ['Compound scaling of depth/width/resolution', 'Compound-scaled encoder', 'Best params-per-Dice ratio'],
  },
  SegResNet: {
    inputs: '2D slice (1×160×160)',
    paper: 'Myronenko, MICCAI-W 2019',
    highlights: ['ResNet encoder + upsampling decoder', 'VAE regularisation branch', 'High Dice on small structures'],
  },
};

const VERSION_STATUS_COLORS: Record<string, string> = {
  registered: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  trained: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  validated: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  deployed: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export const ModelsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'zoo' | 'registry'>('zoo');
  const [architectures, setArchitectures] = useState<Architecture[]>([]);
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [benchmarks, setBenchmarks] = useState<Record<string, BenchmarkResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/v1/models/architectures'),
      axios.get('/api/v1/models/versions'),
      axios.get('/api/v1/benchmarks/results'),
    ]).then(([archRes, verRes, benchRes]) => {
      setArchitectures(archRes.data || []);
      setVersions(verRes.data || []);
      const bmap: Record<string, BenchmarkResult> = {};
      for (const b of (benchRes.data || [])) {
        bmap[b.model_name] = b;
      }
      setBenchmarks(bmap);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const archById = Object.fromEntries(architectures.map(a => [a.id, a]));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            <span>Model Zoo</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-normal">
              {architectures.length} Architectures
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Registered segmentation architectures for short-axis cardiac MRI. All models operate on 2D slices (1×160×160).
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'zoo', label: 'Architecture Zoo' },
          { key: 'registry', label: 'Model Registry' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'registry' && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            All registered model versions with lifecycle status (registered → trained → validated → deployed).
          </p>
          {versions.length === 0 ? (
            <div className="glass-panel p-8 rounded-xl border border-border text-center text-xs text-muted-foreground">
              No model versions registered. Seed with seed_demo.py.
            </div>
          ) : (
            <div className="overflow-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/60">
                    {['Architecture', 'Version Tag', 'Status', 'Parameters', 'FLOPs (GFLOPs)', 'Weights', 'Registered'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {versions.map(v => {
                    const arch = archById[v.architecture_id];
                    return (
                      <tr key={v.id} className="border-b border-border/40 hover:bg-card/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`font-medium ${ARCH_COLORS[arch?.name ?? '']?.split(' ')[0] ?? 'text-foreground'}`}>
                            {arch?.display_name ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          {v.version_tag}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${VERSION_STATUS_COLORS[v.status] ?? 'text-muted-foreground'}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {arch ? formatParams(arch.num_parameters) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {arch ? arch.flops.toFixed(1) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px]">
                          {v.status === 'registered' ? (
                            <span className="text-muted-foreground/50 italic">No weights (pre-training)</span>
                          ) : (
                            <span className="text-emerald-400/70">Linked</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'zoo' && (<>
      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading model registry…</div>
      ) : architectures.length === 0 ? (
        <div className="glass-panel rounded-xl border border-border p-8 text-center space-y-3">
          <Boxes className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">No architectures registered</p>
          <p className="text-xs text-muted-foreground">Run <code className="font-mono bg-card px-1 py-0.5 rounded">python scripts/seed_demo.py</code> to register architectures.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {architectures.map(arch => {
            const bm = benchmarks[arch.name];
            const colorClass = ARCH_COLORS[arch.name] ?? 'text-muted-foreground border-border bg-card';
            const details = ARCH_DESCRIPTIONS[arch.name];
            return (
              <div key={arch.id} className={`glass-panel rounded-xl border p-5 space-y-4 ${colorClass}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-foreground">{arch.display_name}</h2>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{arch.name}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${colorClass}`}>
                    {bm
                      ? <><CheckCircle2 className="w-3 h-3" />Benchmarked</>
                      : <><Clock className="w-3 h-3" />Seeded</>
                    }
                  </span>
                </div>

                {/* Summary */}
                <p className="text-xs text-muted-foreground">{arch.summary}</p>

                {/* Architecture facts */}
                {details && (
                  <div className="space-y-1">
                    {details.highlights.map(h => (
                      <div key={h} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <div className="w-1 h-1 rounded-full bg-current opacity-60 flex-shrink-0" />
                        {h}
                      </div>
                    ))}
                  </div>
                )}

                {/* Parameters row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card/60 rounded-lg p-2.5 text-center">
                    <Cpu className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-bold text-foreground font-mono">{formatParams(arch.num_parameters)}</p>
                    <p className="text-[10px] text-muted-foreground">Parameters</p>
                  </div>
                  <div className="bg-card/60 rounded-lg p-2.5 text-center">
                    <Zap className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-bold text-foreground font-mono">{arch.flops?.toFixed(1) ?? '—'}G</p>
                    <p className="text-[10px] text-muted-foreground">GFLOPs</p>
                  </div>
                  <div className="bg-card/60 rounded-lg p-2.5 text-center">
                    <Activity className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-bold text-foreground font-mono">
                      {bm ? `${bm.latency_median_ms}ms` : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Latency</p>
                  </div>
                </div>

                {/* Benchmark metrics */}
                {bm && (
                  <div className="border-t border-border/40 pt-3 space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" /> Benchmark Results
                      {bm.is_precomputed && <span className="normal-case font-normal">(precomputed research baseline)</span>}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Mean', val: bm.mean_dice },
                        { label: 'LV', val: bm.lv_dice },
                        { label: 'RV', val: bm.rv_dice },
                        { label: 'MYO', val: bm.myo_dice },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-card/60 rounded-lg p-2 text-center">
                          <p className="text-xs font-bold text-foreground font-mono">{val.toFixed(3)}</p>
                          <p className="text-[10px] text-muted-foreground">{label} Dice</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      Research / AI-derived quantitative measurements — not clinical diagnosis. Hardware: {bm.hardware}
                    </p>
                  </div>
                )}

                {/* Paper ref */}
                {details?.paper && (
                  <p className="text-[10px] text-muted-foreground opacity-70">
                    Ref: {details.paper}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action bar */}
      {benchmarks && Object.keys(benchmarks).length === 0 && architectures.length > 0 && (
        <div className="glass-panel rounded-xl border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground">Ready to benchmark</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Run the benchmark suite to generate Dice, IoU, latency, and size metrics for all architectures.
            </p>
          </div>
          <Link
            to="/benchmarks"
            className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            Go to Benchmarks <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
      </>)}

    </div>
  );
};
