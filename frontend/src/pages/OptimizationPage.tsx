import React, { useState, useEffect } from 'react';
import { GitMerge, Sliders, ShieldCheck, Award, TrendingUp, Cpu } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import axios from 'axios';

interface RankedModel {
  rank: number;
  id: string;
  architecture: string;
  name: string;
  mean_dice: number;
  latency_median_ms: number;
  num_parameters_m: number;
  flops_gflops: number;
  topsis_score: number;
}

interface ParetoModel {
  id: string;
  name: string;
  mean_dice: number;
  latency_median_ms: number;
  flops_gflops: number;
  model_size_mb: number;
  is_pareto_optimal?: boolean;
}

export const OptimizationPage: React.FC = () => {
  const [weights, setWeights] = useState({
    dice: 0.4,
    latency: 0.3,
    params: 0.15,
    flops: 0.15
  });

  const [rankings, setRankings] = useState<RankedModel[]>([]);
  const [paretoData, setParetoData] = useState<ParetoModel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchOptimizationData = async () => {
    setLoading(true);
    try {
      // Fetch TOPSIS Rankings
      const resRank = await axios.post('http://localhost:8000/api/v1/optimization/mcdm-rank', weights);
      setRankings(resRank.data.rankings || []);

      // Fetch Pareto Frontier
      const resPareto = await axios.get('http://localhost:8000/api/v1/optimization/pareto');
      setParetoData(resPareto.data.all_models || []);
    } catch (err) {
      console.error('Failed to load optimization data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptimizationData();
  }, [weights]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <GitMerge className="w-6 h-6 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Pareto & TOPSIS MCDM Decision Support</h1>
          <p className="text-xs text-muted-foreground">Multi-criteria decision support ranking tailored to objective trade-offs (Accuracy vs Latency vs Footprint).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOPSIS Weight Sliders Panel */}
        <div className="glass-panel p-5 rounded-xl border border-border space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Multi-Criteria Weight Sliders</span>
          </h2>
          <p className="text-[11px] text-muted-foreground">Adjust target objective weights to dynamically re-compute TOPSIS decision support rankings.</p>

          <div className="space-y-4 pt-2">
            {/* Accuracy / Dice Weight */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground font-medium">Segmentation Accuracy (Dice)</span>
                <span className="font-mono text-emerald-400">{(weights.dice * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.dice}
                onChange={(e) => setWeights({ ...weights, dice: Number(e.target.value) })}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Latency Weight */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground font-medium">Inference Latency Speed</span>
                <span className="font-mono text-cyan-400">{(weights.latency * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.latency}
                onChange={(e) => setWeights({ ...weights, latency: Number(e.target.value) })}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Model Parameters Weight */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground font-medium">Memory Footprint (Parameters)</span>
                <span className="font-mono text-purple-400">{(weights.params * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.params}
                onChange={(e) => setWeights({ ...weights, params: Number(e.target.value) })}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* FLOPs Weight */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground font-medium">Compute Efficiency (FLOPs)</span>
                <span className="font-mono text-amber-400">{(weights.flops * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.flops}
                onChange={(e) => setWeights({ ...weights, flops: Number(e.target.value) })}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* TOPSIS Ranked Table */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>TOPSIS Decision-Support Ranking</span>
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground">Objective Tailored Ranking</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground bg-muted/20">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Architecture</th>
                  <th className="py-2.5 px-3">Mean Dice</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Params</th>
                  <th className="py-2.5 px-3">TOPSIS Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rankings.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                        r.rank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-muted text-muted-foreground'
                      }`}>
                        #{r.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">{r.architecture}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{(r.mean_dice * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300">{r.latency_median_ms} ms</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{r.num_parameters_m}M</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">{r.topsis_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pareto Frontier Scatter Chart */}
      <div className="glass-panel p-5 rounded-xl border border-border space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Pareto Frontier Trade-Off Space (Accuracy vs Latency)</span>
        </h2>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="latency_median_ms" name="Latency" unit="ms" stroke="#94a3b8" />
              <YAxis type="number" dataKey="mean_dice" name="Dice" domain={[0.85, 0.95]} stroke="#94a3b8" />
              <ZAxis type="number" dataKey="model_size_mb" range={[60, 400]} name="Model Size" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
              <Scatter name="Models" data={paretoData}>
                {paretoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.is_pareto_optimal ? '#34d399' : '#818cf8'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

