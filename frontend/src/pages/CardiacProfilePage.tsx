import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Activity, ShieldAlert, Layers, Brain, User, Info, Database, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { Heart3DViewer, HeartStructure } from '../components/Heart3DViewer';

interface ClassifierResult {
  probabilities: Record<string, number>;
  top_prediction: string;
  true_group: string | null;
}

interface CardiacData {
  subject_id: string;
  source: 'acdc' | 'synthetic';
  group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bsa_m2: number | null;
  ed_frame: string;
  es_frame: string;
  disclaimer: string;
  voxel_spacing_mm: number[];
  voxel_counts: { LV_ED: number; LV_ES: number; RV_ED: number; RV_ES: number; MYO_ED: number };
  metrics: {
    LV: { EDV_mL: number; ESV_mL: number; SV_mL: number; EF_percent: number; EDV_indexed_mL_m2: number | null };
    RV: { EDV_mL: number; ESV_mL: number; SV_mL: number; EF_percent: number };
    Myocardium: { Mass_g: number; Mass_indexed_g_m2: number | null; MaxThickness_mm: number };
  };
  classifier: ClassifierResult;
}

interface SubjectEntry {
  subject_id: string;
  source: string;
  label: string;
  group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
}

const GROUP_COLORS: Record<string, string> = {
  NOR: '#34d399', MINF: '#f87171', DCM: '#fb923c', HCM: '#c084fc', RV: '#22d3ee',
};

const ACDC_GROUP_LABELS: Record<string, string> = {
  NOR: 'Normal Cardiac Function',
  MINF: 'Previous Myocardial Infarction',
  DCM: 'Dilated Cardiomyopathy',
  HCM: 'Hypertrophic Cardiomyopathy',
  RV: 'Abnormal Right Ventricle',
};

const STRUCTURE_INFO: Record<string, { color: string; desc: string; role: string; quantitative?: boolean }> = {
  LV: {
    color: '#f87171',
    desc: 'The left ventricle (LV) pumps oxygenated blood into the aorta and systemic circulation. It is the most muscular and thick-walled chamber, generating the highest pressure.',
    role: 'Primary pumping chamber — systemic circulation',
    quantitative: true,
  },
  RV: {
    color: '#93c5fd',
    desc: 'The right ventricle (RV) receives deoxygenated blood from the right atrium and pumps it to the lungs via the pulmonary trunk. It has a thin wall and crescent-shaped cross-section.',
    role: 'Pulmonary circulation pump',
    quantitative: true,
  },
  MYO: {
    color: '#fcd34d',
    desc: 'The myocardium is the muscular wall of the left ventricle. Wall thickness and mass are key markers of cardiac hypertrophy and pathological remodeling.',
    role: 'Cardiac muscle — wall thickness & mass',
    quantitative: true,
  },
  LA: {
    color: '#fca5a5',
    desc: 'The left atrium (LA) receives oxygenated blood returning from the lungs via the four pulmonary veins. It passes blood through the mitral valve into the left ventricle. LA dilation is a marker of chronic elevated filling pressures.',
    role: 'Receiving chamber — oxygenated pulmonary venous return',
    quantitative: false,
  },
  RA: {
    color: '#bfdbfe',
    desc: 'The right atrium (RA) collects deoxygenated blood returning from the body via the superior and inferior vena cavae, and from the heart itself via the coronary sinus. It pumps blood through the tricuspid valve into the right ventricle.',
    role: 'Receiving chamber — systemic venous return',
    quantitative: false,
  },
};

const EFBar: React.FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono font-bold" style={{ color }}>{value}%</span>
    </div>
    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
    </div>
  </div>
);

const ClassifierBar: React.FC<{ group: string; prob: number; isTop: boolean; isTrue: boolean | null }> = ({ group, prob, isTop, isTrue }) => {
  const color = GROUP_COLORS[group] ?? '#94a3b8';
  const pct = Math.round(prob * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-mono font-semibold flex items-center gap-1" style={{ color }}>
          {group}
          {isTop && <span className="px-1 py-0.5 rounded text-[8px] bg-white/10">TOP</span>}
          {isTrue && <span className="px-1 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-300">TRUE</span>}
        </span>
        <span className="text-muted-foreground font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: isTop ? 1 : 0.55 }} />
      </div>
      <p className="text-[9px] text-muted-foreground">{ACDC_GROUP_LABELS[group]}</p>
    </div>
  );
};

type Tab = '3d' | 'function' | 'classifier';

export const CardiacProfilePage: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [data, setData] = useState<CardiacData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected3D, setSelected3D] = useState<HeartStructure>(null);
  const [activeTab, setActiveTab] = useState<Tab>('3d');

  useEffect(() => {
    axios.get('/api/v1/cardiac/subjects').then(r => {
      setSubjects(r.data);
      if (r.data.length > 0) setSelectedId(r.data[0].subject_id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setData(null);
    setSelected3D(null);
    axios.post(`/api/v1/cardiac/compute-quantification/${selectedId}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to compute.'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleSelect3D = useCallback((s: HeartStructure) => {
    setSelected3D(s);
    if (s) setActiveTab('3d');
  }, []);

  const getSelectedMetrics = () => {
    if (!data || !selected3D) return null;
    if (selected3D === 'LV') return data.metrics.LV;
    if (selected3D === 'RV') return data.metrics.RV;
    if (selected3D === 'MYO') return data.metrics.Myocardium;
    return null;
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: '3d', label: '3D Structure' },
    { id: 'function', label: 'Function' },
    { id: 'classifier', label: 'AI Profile' },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Heart className="w-6 h-6 text-red-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Cardiac AI Profile</h1>
            <p className="text-xs text-muted-foreground">3D interactive anatomy · Function · AI Research Classifier</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0">Subject:</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-red-500 max-w-xs"
          >
            <optgroup label="Synthetic">
              {subjects.filter(s => s.source === 'synthetic').map(s => (
                <option key={s.subject_id} value={s.subject_id}>{s.label}</option>
              ))}
            </optgroup>
            <optgroup label="ACDC Real Data">
              {subjects.filter(s => s.source === 'acdc').map(s => (
                <option key={s.subject_id} value={s.subject_id}>{s.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Research / AI-derived quantitative measurements — not clinical diagnosis.</strong>
          {data?.source === 'acdc' && ' ACDC: Bernard O. et al. IEEE TMI 37(11):2514–2525, 2018. CC BY-NC-SA 4.0.'}
          {data?.source === 'synthetic' && ' SYNTHETIC — procedurally generated phantom, not real anatomy.'}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <span className="animate-spin mr-2 w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
          Computing cardiac quantification…
        </div>
      )}
      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">{error}</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 xl:gap-6">

          {/* ── LEFT: 3D Viewer ── */}
          <div className="lg:col-span-3 glass-panel rounded-xl border border-border overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-border bg-background/40">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                    activeTab === t.id
                      ? 'border-red-500 text-red-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 3D Panel */}
            {activeTab === '3d' && (
              <div className="flex-1 flex flex-col">
                <div className="h-[420px] sm:h-[500px] lg:h-[560px] xl:h-[640px] 2xl:h-[700px]">
                  <Heart3DViewer
                    metrics={data.metrics}
                    onSelect={handleSelect3D}
                    selected={selected3D}
                  />
                </div>

                {/* Structure detail cards below 3D */}
                <div className="p-4 border-t border-border bg-background/30 grid grid-cols-5 gap-2">
                  {(['LV', 'RV', 'MYO', 'LA', 'RA'] as const).map(s => {
                    const info = STRUCTURE_INFO[s];
                    const isActive = selected3D === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setSelected3D(isActive ? null : s)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'border-opacity-100 bg-opacity-15'
                            : 'border-border bg-background/20 hover:bg-background/40'
                        }`}
                        style={isActive ? { borderColor: info.color + '88', backgroundColor: info.color + '18' } : {}}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
                          <span className="text-[10px] font-bold" style={{ color: isActive ? info.color : undefined }}>{s}</span>
                        </div>
                        {s === 'LV' && (
                          <div className="font-mono">
                            <div className="text-muted-foreground text-[8px]">EF</div>
                            <div className="text-[11px] font-bold" style={{ color: info.color }}>{data.metrics.LV.EF_percent}%</div>
                          </div>
                        )}
                        {s === 'RV' && (
                          <div className="font-mono">
                            <div className="text-muted-foreground text-[8px]">EF</div>
                            <div className="text-[11px] font-bold" style={{ color: info.color }}>{data.metrics.RV.EF_percent}%</div>
                          </div>
                        )}
                        {s === 'MYO' && (
                          <div className="font-mono">
                            <div className="text-muted-foreground text-[8px]">Mass</div>
                            <div className="text-[11px] font-bold" style={{ color: info.color }}>{data.metrics.Myocardium.Mass_g}g</div>
                          </div>
                        )}
                        {(s === 'LA' || s === 'RA') && (
                          <div className="text-[8px] text-muted-foreground leading-tight">Anatomy</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Function Panel */}
            {activeTab === 'function' && (
              <div className="p-5 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {/* LV */}
                  <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-xs font-semibold">Left Ventricle</span>
                    </div>
                    {[['EDV', data.metrics.LV.EDV_mL, 'mL'], ['ESV', data.metrics.LV.ESV_mL, 'mL'], ['SV', data.metrics.LV.SV_mL, 'mL']].map(([k, v, u]) => (
                      <div key={String(k)} className="flex justify-between text-[11px] font-mono border-b border-border/30 pb-1">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="text-foreground font-bold">{v} {u}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[11px] font-mono pt-1">
                      <span className="text-red-400 font-semibold">EF</span>
                      <span className="text-red-400 font-bold">{data.metrics.LV.EF_percent}%</span>
                    </div>
                    {data.metrics.LV.EDV_indexed_mL_m2 && (
                      <div className="text-[10px] text-muted-foreground">EDVi: {data.metrics.LV.EDV_indexed_mL_m2} mL/m²</div>
                    )}
                  </div>
                  {/* RV */}
                  <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                      <span className="text-xs font-semibold">Right Ventricle</span>
                    </div>
                    {[['EDV', data.metrics.RV.EDV_mL, 'mL'], ['ESV', data.metrics.RV.ESV_mL, 'mL'], ['SV', data.metrics.RV.SV_mL, 'mL']].map(([k, v, u]) => (
                      <div key={String(k)} className="flex justify-between text-[11px] font-mono border-b border-border/30 pb-1">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="text-foreground font-bold">{v} {u}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[11px] font-mono pt-1">
                      <span className="text-cyan-400 font-semibold">EF</span>
                      <span className="text-cyan-400 font-bold">{data.metrics.RV.EF_percent}%</span>
                    </div>
                  </div>
                </div>
                {/* MYO + EF bars */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold">Myocardium</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[11px] font-mono">
                    <div><div className="text-muted-foreground text-[9px]">Mass</div><div className="font-bold text-amber-400">{data.metrics.Myocardium.Mass_g} g</div></div>
                    <div><div className="text-muted-foreground text-[9px]">Wall Thick.</div><div className="font-bold">{data.metrics.Myocardium.MaxThickness_mm} mm</div></div>
                    <div><div className="text-muted-foreground text-[9px]">Density</div><div className="font-bold">1.05 g/mL</div></div>
                  </div>
                  {data.metrics.Myocardium.Mass_indexed_g_m2 && (
                    <div className="text-[10px] text-muted-foreground">LVMi: {data.metrics.Myocardium.Mass_indexed_g_m2} g/m²</div>
                  )}
                </div>
                <div className="space-y-3">
                  <EFBar value={data.metrics.LV.EF_percent} color="#ef4444" label="LV Ejection Fraction" />
                  <EFBar value={data.metrics.RV.EF_percent} color="#22d3ee" label="RV Ejection Fraction" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                  {[
                    ['BSA', data.bsa_m2 ? `${data.bsa_m2} m²` : '—'],
                    ['Height', data.height_cm ? `${data.height_cm} cm` : '—'],
                    ['Weight', data.weight_kg ? `${data.weight_kg} kg` : '—'],
                    ['Source', data.source === 'acdc' ? 'ACDC Kaggle' : 'Synthetic'],
                    ['ED Frame', data.ed_frame],
                    ['ES Frame', data.es_frame],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Classifier Panel */}
            {activeTab === 'classifier' && (
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-purple-300 leading-tight">
                    <strong>Research classification output — not a diagnosis.</strong> Simulated classifier using volumetric cardiac features derived from ground-truth masks.
                  </p>
                </div>
                <div className="space-y-4">
                  {Object.entries(data.classifier.probabilities)
                    .sort((a, b) => b[1] - a[1])
                    .map(([group, prob]) => (
                      <ClassifierBar
                        key={group} group={group} prob={prob}
                        isTop={group === data.classifier.top_prediction}
                        isTrue={data.classifier.true_group !== null ? group === data.classifier.true_group : null}
                      />
                    ))}
                </div>
                <div className="p-3 rounded-xl border mt-2" style={{
                  borderColor: (GROUP_COLORS[data.classifier.top_prediction] ?? '#94a3b8') + '55',
                  backgroundColor: (GROUP_COLORS[data.classifier.top_prediction] ?? '#94a3b8') + '11',
                }}>
                  <div className="text-[9px] text-muted-foreground">Top Research Output</div>
                  <div className="text-lg font-bold font-mono mt-0.5" style={{ color: GROUP_COLORS[data.classifier.top_prediction] }}>
                    {data.classifier.top_prediction}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{ACDC_GROUP_LABELS[data.classifier.top_prediction]}</div>
                  {data.classifier.true_group && (
                    <div className={`text-[10px] mt-2 pt-2 border-t border-border/40 ${data.classifier.top_prediction === data.classifier.true_group ? 'text-emerald-400' : 'text-amber-400'}`}>
                      ACDC true group: <strong>{data.classifier.true_group}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Selected structure details ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Selected structure detail */}
            {selected3D ? (
              <div className="glass-panel rounded-xl border overflow-hidden"
                style={{ borderColor: STRUCTURE_INFO[selected3D].color + '55' }}>
                <div className="px-4 py-3 border-b flex items-center gap-2"
                  style={{ borderColor: STRUCTURE_INFO[selected3D].color + '33', backgroundColor: STRUCTURE_INFO[selected3D].color + '10' }}>
                  <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: STRUCTURE_INFO[selected3D].color }} />
                  <span className="text-sm font-bold" style={{ color: STRUCTURE_INFO[selected3D].color }}>
                    {selected3D === 'LV' ? 'Left Ventricle' : selected3D === 'RV' ? 'Right Ventricle' : selected3D === 'MYO' ? 'Myocardium' : selected3D === 'LA' ? 'Left Atrium' : 'Right Atrium'}
                  </span>
                  <span className="ml-auto text-[9px] font-mono text-muted-foreground">Selected</span>
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {STRUCTURE_INFO[selected3D].desc}
                  </p>
                  <div className="px-3 py-2 rounded-lg bg-background/50 border border-border/40 text-[10px] text-muted-foreground">
                    <strong className="text-foreground">Role:</strong> {STRUCTURE_INFO[selected3D].role}
                  </div>

                  {/* Structure metrics */}
                  <div className="space-y-2">
                    {selected3D === 'LV' && (
                      <>
                        <div className="text-xs font-semibold text-foreground mb-2">Volumetric Measurements</div>
                        {[
                          ['End-Diastolic Volume', `${data.metrics.LV.EDV_mL} mL`],
                          ['End-Systolic Volume', `${data.metrics.LV.ESV_mL} mL`],
                          ['Stroke Volume', `${data.metrics.LV.SV_mL} mL`],
                          ['Ejection Fraction', `${data.metrics.LV.EF_percent}%`],
                          ...(data.metrics.LV.EDV_indexed_mL_m2 ? [['EDV Indexed', `${data.metrics.LV.EDV_indexed_mL_m2} mL/m²`]] : []),
                          ['ED Voxel Count', `${data.voxel_counts.LV_ED.toLocaleString()}`],
                          ['ES Voxel Count', `${data.voxel_counts.LV_ES.toLocaleString()}`],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between text-[11px] font-mono border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="text-foreground font-bold">{v}</span>
                          </div>
                        ))}
                        <div className="mt-3">
                          <EFBar value={data.metrics.LV.EF_percent} color="#ef4444" label="LV EF" />
                        </div>
                      </>
                    )}
                    {selected3D === 'RV' && (
                      <>
                        <div className="text-xs font-semibold text-foreground mb-2">Volumetric Measurements</div>
                        {[
                          ['End-Diastolic Volume', `${data.metrics.RV.EDV_mL} mL`],
                          ['End-Systolic Volume', `${data.metrics.RV.ESV_mL} mL`],
                          ['Stroke Volume', `${data.metrics.RV.SV_mL} mL`],
                          ['Ejection Fraction', `${data.metrics.RV.EF_percent}%`],
                          ['ED Voxel Count', `${data.voxel_counts.RV_ED.toLocaleString()}`],
                          ['ES Voxel Count', `${data.voxel_counts.RV_ES.toLocaleString()}`],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between text-[11px] font-mono border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="text-foreground font-bold">{v}</span>
                          </div>
                        ))}
                        <div className="mt-3">
                          <EFBar value={data.metrics.RV.EF_percent} color="#22d3ee" label="RV EF" />
                        </div>
                      </>
                    )}
                    {selected3D === 'MYO' && (
                      <>
                        <div className="text-xs font-semibold text-foreground mb-2">Structural Measurements</div>
                        {[
                          ['Myocardial Mass', `${data.metrics.Myocardium.Mass_g} g`],
                          ['Tissue Density', '1.05 g/mL'],
                          ['Max Wall Thickness', `${data.metrics.Myocardium.MaxThickness_mm} mm`],
                          ...(data.metrics.Myocardium.Mass_indexed_g_m2 ? [['LVM Indexed (LVMi)', `${data.metrics.Myocardium.Mass_indexed_g_m2} g/m²`]] : []),
                          ['ED Voxel Count', `${data.voxel_counts.MYO_ED.toLocaleString()}`],
                          ['Voxel Spacing', data.voxel_spacing_mm.map(v => v.toFixed(2)).join('×') + ' mm'],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between text-[11px] font-mono border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="text-foreground font-bold">{v}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {(selected3D === 'LA' || selected3D === 'RA') && (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-foreground mb-2">Anatomical Reference</div>
                        {selected3D === 'LA' && (
                          <div className="space-y-1.5">
                            {[
                              ['Location', 'Upper-left, posterior'],
                              ['Receives from', '4 pulmonary veins (lungs)'],
                              ['Ejects to', 'Left ventricle via mitral valve'],
                              ['Blood type', 'Oxygenated (red)'],
                              ['Pressure', '~8–12 mmHg (filling)'],
                              ['Normal volume', '~50–70 mL'],
                            ].map(([k, v]) => (
                              <div key={k} className="flex justify-between text-[11px] border-b border-border/30 pb-1.5">
                                <span className="text-muted-foreground">{k}</span>
                                <span className="text-foreground font-semibold text-right max-w-[55%]">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {selected3D === 'RA' && (
                          <div className="space-y-1.5">
                            {[
                              ['Location', 'Upper-right, anterior'],
                              ['Receives from', 'SVC, IVC, coronary sinus'],
                              ['Ejects to', 'Right ventricle via tricuspid valve'],
                              ['Blood type', 'Deoxygenated (blue)'],
                              ['Pressure', '~2–6 mmHg (filling)'],
                              ['Normal volume', '~55–65 mL'],
                            ].map(([k, v]) => (
                              <div key={k} className="flex justify-between text-[11px] border-b border-border/30 pb-1.5">
                                <span className="text-muted-foreground">{k}</span>
                                <span className="text-foreground font-semibold text-right max-w-[55%]">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300/80">
                          Quantitative segmentation not available for atria in this dataset. Values above are anatomical reference ranges.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-xl border border-border p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-sm text-muted-foreground">Click a structure in the 3D viewer to inspect its measurements</p>
                <div className="flex gap-2">
                  {(['LV', 'RV', 'MYO'] as const).map(s => (
                    <span key={s} className="text-[10px] px-2 py-1 rounded border font-mono"
                      style={{ borderColor: STRUCTURE_INFO[s].color + '44', color: STRUCTURE_INFO[s].color }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Subject card */}
            <div className="glass-panel rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-foreground">Subject</span>
                {data.source === 'acdc'
                  ? <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">ACDC Real</span>
                  : <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">SYNTHETIC</span>
                }
              </div>
              <div className="space-y-1.5 text-[11px] font-mono">
                {[
                  ['ID', data.subject_id],
                  ['Group', data.group ?? '—'],
                  ['Height', data.height_cm ? `${data.height_cm} cm` : '—'],
                  ['Weight', data.weight_kg ? `${data.weight_kg} kg` : '—'],
                  ['BSA', data.bsa_m2 ? `${data.bsa_m2} m²` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                    <span className="text-muted-foreground">{k}</span>
                    <span style={k === 'Group' && data.group ? { color: GROUP_COLORS[data.group] ?? '#94a3b8', fontWeight: 700 } : {}}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Datasets sourced */}
            <div className="glass-panel rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">Research Datasets</span>
              </div>
              {[
                { name: 'ACDC Cardiac MRI', src: 'Kaggle', n: '27 patients', color: '#60a5fa' },
                { name: 'Heart Failure Clinical', src: 'Kaggle', n: '299 records', color: '#34d399' },
                { name: 'Heart Disease UCI', src: 'Kaggle', n: '303 records', color: '#a78bfa' },
                { name: 'Sunnybrook Cardiac MRI', src: 'Kaggle', n: 'MRI images', color: '#f59e0b' },
                { name: 'CAMUS Echocardiography', src: 'Kaggle', n: 'Echo frames', color: '#fb7185' },
              ].map(d => (
                <div key={d.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-foreground">{d.name}</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{d.n}</span>
                </div>
              ))}
            </div>

            {data.source === 'acdc' && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-300/80 leading-tight">
                Bernard O. et al. (2018). IEEE TMI 37(11):2514–2525. doi:10.1109/TMI.2018.2837502. CC BY-NC-SA 4.0.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
