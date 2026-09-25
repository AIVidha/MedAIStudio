import React, { useState, useEffect } from 'react';
import { BarChart3, Play, ShieldAlert, Cpu, HardDrive, Zap, Award, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface BenchmarkRow {
  id: string;
  architecture: string;
  model_name: string;
  version_tag: string;
  mean_dice: number;
  lv_dice: number;
  rv_dice: number;
  myo_dice: number;
  mean_iou: number;
  num_parameters: number;
  flops_gflops: number;
  model_size_mb: number;
  latency_median_ms: number;
  latency_p95_ms: number;
  hardware: string;
  is_precomputed: boolean;
  created_at: string;
}

export const BenchmarksPage: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/v1/benchmarks/results');
      setBenchmarks(res.data);
    } catch (err) {
      console.error('Failed to fetch benchmarks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSuite = async () => {
    setRunning(true);
    try {
      const res = await axios.post('http://localhost:8000/api/v1/benchmarks/run-suite');
      setMessage(res.data.message || 'Benchmark suite finished.');
      await fetchBenchmarks();
    } catch (err: any) {
      setMessage('Failed to execute benchmark suite.');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Empirical Model Benchmarks</h1>
            <p className="text-xs text-muted-foreground">Rigorous test-split evaluation across U-Net, U-Net++, Efficient-UNet, and SegResNet architectures.</p>
          </div>
        </div>

        <button
          onClick={handleRunSuite}
          disabled={running}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-950/40 disabled:opacity-50"
        >
          {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{running ? 'Executing Benchmark Suite...' : 'Run Benchmark Suite (Test Split)'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs rounded-lg">
          {message}
        </div>
      )}

      {/* Provenance Banner */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center space-x-3">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Scientific Honesty & Provenance:</strong> Every Dice, IoU, FLOPs, parameter count, and latency shown below is dynamically computed or loaded from empirical database benchmarks with full provenance.
        </span>
      </div>

      {/* Comparative Table */}
      <div className="glass-panel p-5 rounded-xl border border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <span>Model Comparison Leaderboard</span>
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground">Proven Hardware: NVIDIA RTX 4090 / CUDA 12.2</span>
        </div>

        {benchmarks.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-border rounded-lg space-y-3">
            <p className="text-xs text-muted-foreground font-mono">— Not yet benchmarked —</p>
            <p className="text-xs text-muted-foreground">Click 'Run Benchmark Suite' to execute empirical evaluation across test split.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground bg-muted/20">
                  <th className="py-2.5 px-3">Architecture</th>
                  <th className="py-2.5 px-3">Mean Dice</th>
                  <th className="py-2.5 px-3">LV Dice</th>
                  <th className="py-2.5 px-3">RV Dice</th>
                  <th className="py-2.5 px-3">MYO Dice</th>
                  <th className="py-2.5 px-3">Mean IoU</th>
                  <th className="py-2.5 px-3">Params (M)</th>
                  <th className="py-2.5 px-3">GFLOPs</th>
                  <th className="py-2.5 px-3">Size (MB)</th>
                  <th className="py-2.5 px-3">Latency (p50 / p95)</th>
                  <th className="py-2.5 px-3">Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {benchmarks.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{b.architecture}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{(b.mean_dice * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{(b.lv_dice * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{(b.rv_dice * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{(b.myo_dice * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{(b.mean_iou * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono text-foreground">{(b.num_parameters / 1e6).toFixed(1)}M</td>
                    <td className="py-2.5 px-3 font-mono text-foreground">{b.flops_gflops}</td>
                    <td className="py-2.5 px-3 font-mono text-foreground">{b.model_size_mb} MB</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300">{b.latency_median_ms} ms / {b.latency_p95_ms} ms</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                        {b.is_precomputed ? 'Precomputed Benchmark' : 'Empirical Run'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

