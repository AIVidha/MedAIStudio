import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
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
  Info,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import axios from 'axios';

interface BenchmarkResult {
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
}

function formatParams(n: number): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function selectBest(results: BenchmarkResult[], profile: string): BenchmarkResult | null {
  if (!results.length) return null;
  const sorted = [...results];
  if (profile === 'Maximum Accuracy') {
    sorted.sort((a, b) => b.mean_dice - a.mean_dice);
  } else if (profile === 'Lightweight') {
    sorted.sort((a, b) => a.num_parameters - b.num_parameters);
  } else if (profile === 'Low Latency') {
    sorted.sort((a, b) => a.latency_median_ms - b.latency_median_ms);
  } else {
    // Balanced: score = dice / (latency * params) — normalised
    const maxDice = Math.max(...results.map(r => r.mean_dice));
    const minLat = Math.min(...results.map(r => r.latency_median_ms));
    const minParams = Math.min(...results.map(r => r.num_parameters));
    sorted.sort((a, b) => {
      const scoreA = (a.mean_dice / maxDice) * 0.5 + (minLat / a.latency_median_ms) * 0.3 + (minParams / a.num_parameters) * 0.2;
      const scoreB = (b.mean_dice / maxDice) * 0.5 + (minLat / b.latency_median_ms) * 0.3 + (minParams / b.num_parameters) * 0.2;
      return scoreB - scoreA;
    });
  }
  return sorted[0];
}

export const DashboardPage: React.FC = () => {
  const [deploymentProfile, setDeploymentProfile] = useState<string>('Maximum Accuracy');
  const [projectName, setProjectName] = useState('Cardiac MRI AI Demo');
  const [modality, setModality] = useState('Short-axis Cine MRI');
  const [anatomy, setAnatomy] = useState('Heart');
  const [task, setTask] = useState('Multi-Structure Segmentation');
  const [numStudies, setNumStudies] = useState<number | string>('—');
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  const [benchmarksLoaded, setBenchmarksLoaded] = useState(false);

  useEffect(() => {
    axios.get('/api/v1/projects').then(res => {
      if (res.data?.length > 0) {
        const p = res.data[0];
        setProjectName(p.name);
        setModality(p.modality);
        setAnatomy(p.anatomy);
        setTask(p.task);
      }
    }).catch(() => {});

    axios.get('/api/v1/datasets').then(res => {
      if (res.data?.length > 0) {
        const total = res.data.reduce((sum: number, d: any) => sum + (d.num_studies || 0), 0);
        if (total > 0) setNumStudies(total);
      }
    }).catch(() => {});

    axios.get('/api/v1/benchmarks/results').then(res => {
      setBenchmarks(res.data || []);
      setBenchmarksLoaded(true);
    }).catch(() => { setBenchmarksLoaded(true); });
  }, []);

  const best = selectBest(benchmarks, deploymentProfile);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <span>Project Dashboard</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-normal">
              Cardiac MRI AI
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Overview of dataset, annotation status, experiments, and benchmark metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-muted-foreground">Deployment Profile:</label>
          <select
            value={deploymentProfile}
            onChange={(e) => setDeploymentProfile(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="Maximum Accuracy">Maximum Accuracy</option>
            <option value="Lightweight">Lightweight</option>
            <option value="Low Latency">Low Latency</option>
            <option value="Balanced">Balanced</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Project Name</span>
            <FolderKanban className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{projectName}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{modality}</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Target Anatomy & Task</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{anatomy}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{task}</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Dataset Studies</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-lg font-bold text-foreground font-mono">{numStudies}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {numStudies !== '—' ? 'Loaded & registered' : 'No dataset loaded'}
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Benchmark Status</span>
            {best
              ? <CheckCircle2 className="w-4 h-4 text-green-400" />
              : <AlertCircle className="w-4 h-4 text-amber-400" />
            }
          </div>
          <p className="text-sm font-semibold text-foreground">
            {best ? `${benchmarks.length} models` : 'Not benchmarked'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {best ? 'Benchmark suite complete' : 'Run benchmark pipeline'}
          </p>
        </div>
      </div>

      {/* Best Model Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Best Model Metrics ({deploymentProfile})</span>
          </h2>
          {!best && (
            <span className="text-[11px] text-muted-foreground italic flex items-center space-x-1">
              <Info className="w-3 h-3 text-amber-400" />
              <span>Not yet benchmarked — run benchmark pipeline to generate metrics</span>
            </span>
          )}
          {best?.is_precomputed && (
            <span className="text-[11px] text-muted-foreground italic flex items-center space-x-1">
              <Info className="w-3 h-3 text-blue-400" />
              <span>Precomputed research benchmark — empirical validation basis</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-border/80">
            <p className="text-xs text-muted-foreground">Best Model</p>
            <p className="text-base font-semibold text-foreground mt-1 font-mono">
              {best?.architecture ?? '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Decision-support ranking</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-border/80">
            <p className="text-xs text-muted-foreground">Mean Dice Score</p>
            <p className="text-xl font-bold text-blue-400 mt-1 font-mono">
              {best ? best.mean_dice.toFixed(3) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Test Split 3D Dice</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-border/80">
            <p className="text-xs text-muted-foreground">Parameters</p>
            <p className="text-xl font-bold text-foreground mt-1 font-mono">
              {best ? formatParams(best.num_parameters) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Total Weights</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-border/80">
            <p className="text-xs text-muted-foreground">FLOPs</p>
            <p className="text-xl font-bold text-foreground mt-1 font-mono">
              {best ? `${best.flops_gflops.toFixed(1)}G` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">GFLOPs (160×160)</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-border/80">
            <p className="text-xs text-muted-foreground">Inference Latency</p>
            <p className="text-xl font-bold text-foreground mt-1 font-mono">
              {best ? `${best.latency_median_ms}ms` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Median Latency / Volume</p>
          </div>
        </div>
      </div>

      {/* Module Navigation */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Platform Workflow Modules
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link to="/datasets" className="glass-panel p-4 rounded-xl border border-border hover:border-blue-500/50 transition-all group">
            <Database className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform mb-2" />
            <h3 className="text-xs font-semibold text-foreground">Dataset Manager</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Import ACDC / DICOM & manage patient splits.</p>
          </Link>

          <Link to="/viewer" className="glass-panel p-4 rounded-xl border border-border hover:border-emerald-500/50 transition-all group">
            <Eye className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform mb-2" />
            <h3 className="text-xs font-semibold text-foreground">NiiVue Viewer</h3>
            <p className="text-[11px] text-muted-foreground mt-1">4D cine MRI WebGL visualization & scroll.</p>
          </Link>

          <Link to="/annotations" className="glass-panel p-4 rounded-xl border border-border hover:border-purple-500/50 transition-all group">
            <PenTool className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform mb-2" />
            <h3 className="text-xs font-semibold text-foreground">Annotation Workspace</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Brush, polygon, fill & AI-assisted segmentation.</p>
          </Link>

          <Link to="/models" className="glass-panel p-4 rounded-xl border border-border hover:border-amber-500/50 transition-all group">
            <Boxes className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-2" />
            <h3 className="text-xs font-semibold text-foreground">Model Zoo</h3>
            <p className="text-[11px] text-muted-foreground mt-1">U-Net, U-Net++, Efficient-UNet & SegResNet.</p>
          </Link>

          <Link to="/benchmarks" className="glass-panel p-4 rounded-xl border border-border hover:border-cyan-500/50 transition-all group">
            <BarChart3 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform mb-2" />
            <h3 className="text-xs font-semibold text-foreground">Model Benchmarking</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Dice, IoU, FLOPs & empirical hardware profiling.</p>
          </Link>

          <Link to="/optimization" className="glass-panel p-4 rounded-xl border border-border hover:border-indigo-500/50 transition-all group">
            <GitMerge className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
            <h3 className="text-xs font-semibold text-foreground">Pareto & MCDM</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Non-dominated sorting & TOPSIS model selection.</p>
          </Link>

          <Link to="/cardiac-profile" className="glass-panel p-4 rounded-xl border border-border hover:border-red-500/50 transition-all group">
            <Heart className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform mb-2" />
            <h3 className="text-xs font-semibold text-foreground">Cardiac AI Profile</h3>
            <p className="text-[11px] text-muted-foreground mt-1">EDV, ESV, EF, myocardial mass & research classifier.</p>
          </Link>

          <Link to="/deployments" className="glass-panel p-4 rounded-xl border border-border hover:border-green-500/50 transition-all group">
            <Rocket className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform mb-2" />
            <h3 className="text-xs font-semibold text-foreground">Deployment Demo</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Live ONNX Runtime REST endpoint & test panel.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};
