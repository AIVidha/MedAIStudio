import React, { useState, useEffect } from 'react';
import { Cpu, Play, CheckCircle2, Clock, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface ModelVersion {
  id: string;
  architecture_id: string;
  version_tag: string;
  status: string;
}

interface Architecture {
  id: string;
  name: string;
  display_name: string;
}

interface InferenceResult {
  run_id: string;
  subject_id: string;
  architecture: string;
  model_version: string;
  status: string;
  processing_time_ms: number;
  data_source?: string;
  weights_loaded?: boolean;
  model_source?: string;
  n_slices_processed?: number;
  segmentation_metrics: {
    LV_Dice: number;
    RV_Dice: number;
    MYO_Dice: number;
    Mean_Dice: number;
  };
  disclaimer: string;
  note: string;
}

interface RunHistory {
  id: string;
  architecture: string;
  subject_id: string;
  status: string;
  processing_time_ms: number | null;
  created_at: string | null;
}

// Subjects loaded from API below

const DICE_COLOR = (v: number) =>
  v >= 0.92 ? 'text-emerald-400' : v >= 0.87 ? 'text-amber-400' : 'text-red-400';

export const InferencePage: React.FC = () => {
  const [architectures, setArchitectures] = useState<Architecture[]>([]);
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [history, setHistory] = useState<RunHistory[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedArch, setSelectedArch] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('patient001');
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/api/v1/models/architectures').then(r => {
      setArchitectures(r.data);
      if (r.data.length > 0) setSelectedArch(r.data[0].id);
    }).catch(() => {});
    axios.get('/api/v1/models/versions').then(r => setVersions(r.data)).catch(() => {});
    axios.get('/api/v1/viewer/subjects').then(r => {
      const ids: string[] = r.data.map((s: { subject_id: string }) => s.subject_id);
      setSubjects(ids);
      if (ids.length > 0) setSelectedSubject(ids[0]);
    }).catch(() => setSubjects(['patient001', 'patient002', 'patient003']));
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    axios.get('/api/v1/inference/runs').then(r => setHistory(r.data)).catch(() => {});
  };

  const getVersionForArch = (archId: string) =>
    versions.find(v => v.architecture_id === archId);

  const handleRun = async () => {
    const mv = getVersionForArch(selectedArch);
    if (!mv) { setError('No model version found for this architecture.'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post('/api/v1/inference/run', {
        model_version_id: mv.id,
        subject_id: selectedSubject,
      });
      setResult(res.data);
      fetchHistory();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Inference failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectedArchObj = architectures.find(a => a.id === selectedArch);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-violet-400" />
            <span>One-Click Inference</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Run segmentation inference on synthetic cardiac MRI subjects.
          </p>
        </div>
      </div>

      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300/90 flex items-start gap-2">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
        <span>Research prototype — not for clinical use. Runs real MONAI U-Net forward pass on ACDC NIfTI data. Dice scores are computed against GT masks. If no checkpoint exists, random weights are used and noted in the result.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-5 rounded-xl border border-border space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Run Configuration</h2>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Architecture</label>
              <select
                value={selectedArch}
                onChange={e => setSelectedArch(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-lg"
              >
                {architectures.map(a => (
                  <option key={a.id} value={a.id}>{a.display_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Subject (Synthetic Demo)</label>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-lg"
              >
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {selectedArchObj && (
              <div className="bg-card/60 rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Architecture</span>
                  <span className="font-mono text-foreground">{selectedArchObj.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono text-foreground">{getVersionForArch(selectedArch)?.version_tag ?? '—'}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleRun}
              disabled={loading || !selectedArch}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {loading ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Running…</span></>
              ) : (
                <><Play className="w-3.5 h-3.5" /><span>Run Inference</span></>
              )}
            </button>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <div className="glass-panel p-5 rounded-xl border border-border space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-foreground">Inference Result</h2>
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />{result.processing_time_ms} ms
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Mean Dice', value: result.segmentation_metrics.Mean_Dice },
                  { label: 'LV Dice', value: result.segmentation_metrics.LV_Dice },
                  { label: 'RV Dice', value: result.segmentation_metrics.RV_Dice },
                  { label: 'MYO Dice', value: result.segmentation_metrics.MYO_Dice },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-card/60 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold font-mono mt-0.5 ${DICE_COLOR(value)}`}>
                      {value.toFixed(3)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-xs">
                {[
                  ['Subject', result.subject_id],
                  ['Architecture', result.architecture],
                  ['Model Version', result.model_version],
                  ['Slices processed', result.n_slices_processed?.toString() ?? '—'],
                  ['Data source', result.data_source ?? '—'],
                  ['Model', result.model_source ?? (result.weights_loaded ? '✓ Trained checkpoint' : '⚠ Random (untrained)')],
                  ['Run ID', result.run_id.slice(0, 8) + '…'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={`font-mono ${k === 'Model' && !result.weights_loaded && !result.model_source ? 'text-amber-400' : 'text-foreground'}`}>{v}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                {result.note}
              </p>
            </div>
          ) : (
            <div className="glass-panel p-10 rounded-xl border border-border text-center space-y-3">
              <Cpu className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-medium text-foreground">No result yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Select an architecture and subject, then click Run Inference to execute a simulated segmentation pass.
              </p>
            </div>
          )}

          {/* Run History */}
          {history.length > 0 && (
            <div className="glass-panel rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-card/40">
                <h3 className="text-xs font-semibold text-foreground">Run History</h3>
              </div>
              <div className="overflow-auto max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-card/20">
                      {['Run ID', 'Architecture', 'Subject', 'Time (ms)', 'Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice().reverse().slice(0, 20).map(r => (
                      <tr key={r.id} className="border-b border-border/20 hover:bg-card/30 transition-colors">
                        <td className="px-3 py-2 font-mono text-muted-foreground">{r.id.slice(0, 8)}…</td>
                        <td className="px-3 py-2 text-foreground">{r.architecture}</td>
                        <td className="px-3 py-2 font-mono text-foreground">{r.subject_id}</td>
                        <td className="px-3 py-2 font-mono">{r.processing_time_ms ?? '—'}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
