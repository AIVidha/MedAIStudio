import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle2, ShieldAlert, Database, BarChart3 } from 'lucide-react';
import axios from 'axios';

interface BenchmarkRow {
  architecture: string;
  version: string;
  mean_dice: number;
  lv_dice: number;
  rv_dice: number;
  myo_dice: number;
  mean_iou: number;
  num_parameters_M: number;
  flops_GFLOPs: number;
  model_size_mb: number;
  latency_median_ms: number;
  hardware: string;
}

interface CardiacRow {
  subject: string;
  research_group: string;
  source: string;
  lv_edv_ml: number;
  lv_esv_ml: number;
  lv_ef_percent: number;
  rv_edv_ml: number;
  rv_ef_percent: number;
  myo_mass_g: number;
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'benchmark' | 'cardiac'>('benchmark');
  const [benchRows, setBenchRows] = useState<BenchmarkRow[]>([]);
  const [cardiacRows, setCardiacRows] = useState<CardiacRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/v1/reports/benchmark-summary').then(r => setBenchRows(r.data.results ?? [])),
      axios.get('/api/v1/reports/cardiac-summary').then(r => setCardiacRows(r.data.measurements ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  const downloadCSV = (endpoint: string, filename: string) => {
    window.open(`/api/v1/reports/${endpoint}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <span>Reports & Export</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Export benchmark and cardiac quantification data as CSV or JSON.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV('benchmark-summary.csv', 'medai_benchmark_report.csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600/20 border border-teal-600/40 hover:bg-teal-600/30 text-teal-300 text-xs font-medium rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Benchmark CSV
          </button>
          <button
            onClick={() => downloadCSV('cardiac-summary.csv', 'medai_cardiac_report.csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 border border-rose-600/40 hover:bg-rose-600/30 text-rose-300 text-xs font-medium rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Cardiac CSV
          </button>
        </div>
      </div>

      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300/90 flex items-start gap-2">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
        <span>
          Research / AI-derived quantitative measurements — not clinical diagnosis.
          Precomputed research benchmarks on synthetic cardiac MRI data (SYNTHETIC — not real anatomy).
          ACDC citation required in all publications: Bernard O. et al. IEEE TMI 37(11):2514–2525, 2018.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'benchmark', label: 'Benchmark Report', icon: BarChart3 },
          { key: 'cardiac', label: 'Cardiac Report', icon: Database },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-panel p-10 rounded-xl border border-border text-center text-xs text-muted-foreground">
          Loading report data…
        </div>
      ) : activeTab === 'benchmark' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>{benchRows.length} benchmark result(s) available</span>
          </div>
          {benchRows.length === 0 ? (
            <div className="glass-panel p-8 rounded-xl border border-border text-center text-xs text-muted-foreground">
              No benchmark results. Run seed_demo.py to populate data.
            </div>
          ) : (
            <div className="overflow-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/60">
                    {['Architecture', 'Version', 'Mean Dice', 'LV', 'RV', 'MYO', 'IoU', 'Params (M)', 'FLOPs', 'Size (MB)', 'Latency (ms)', 'Hardware'].map(h => (
                      <th key={h} className="text-left px-3 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benchRows.map((r, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-card/30 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-foreground">{r.architecture}</td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.version}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-emerald-400">{r.mean_dice.toFixed(3)}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.lv_dice.toFixed(3)}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.rv_dice.toFixed(3)}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.myo_dice.toFixed(3)}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.mean_iou.toFixed(3)}</td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.num_parameters_M}</td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.flops_GFLOPs}</td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.model_size_mb}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.latency_median_ms}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.hardware}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
            <span>{cardiacRows.length} cardiac measurement(s) available</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px]">
              SYNTHETIC — not real anatomy
            </span>
          </div>
          {cardiacRows.length === 0 ? (
            <div className="glass-panel p-8 rounded-xl border border-border text-center text-xs text-muted-foreground">
              No cardiac measurements. Use Cardiac Profile page to compute metrics.
            </div>
          ) : (
            <div className="overflow-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/60">
                    {['Subject', 'Group', 'Source', 'LV EDV (mL)', 'LV ESV (mL)', 'LV EF (%)', 'RV EDV (mL)', 'RV EF (%)', 'Myo Mass (g)'].map(h => (
                      <th key={h} className="text-left px-3 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cardiacRows.map((r, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-card/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.subject}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-card text-[10px] font-mono text-muted-foreground border border-border/50">
                          {r.research_group ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.source}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.lv_edv_ml?.toFixed(1) ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.lv_esv_ml?.toFixed(1) ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-emerald-400">{r.lv_ef_percent?.toFixed(1) ?? '—'}%</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.rv_edv_ml?.toFixed(1) ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.rv_ef_percent?.toFixed(1) ?? '—'}%</td>
                      <td className="px-3 py-2.5 font-mono text-foreground">{r.myo_mass_g?.toFixed(1) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
