import React, { useState, useEffect } from 'react';
import { Heart, Activity, Play, ShieldAlert, CheckCircle2, User, Layers, Info } from 'lucide-react';
import axios from 'axios';

interface CardiacMetricData {
  subject_id: string;
  disclaimer: string;
  voxel_spacing_mm: number[];
  metrics: {
    LV: { EDV_mL: number; ESV_mL: number; SV_mL: number; EF_percent: number };
    RV: { EDV_mL: number; ESV_mL: number; SV_mL: number; EF_percent: number };
    Myocardium: { Mass_g: number; MaxThickness_mm: number };
  };
}

export const CardiacProfilePage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('patient001');
  const [data, setData] = useState<CardiacMetricData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const demoSubjects = [
    { id: 'patient001', name: 'Demo Test Case 1: patient001 (NOR - Normal Physiology)', group: 'NOR' },
    { id: 'patient002', name: 'Demo Test Case 2: patient002 (MINF - Myocardial Infarction)', group: 'MINF' },
    { id: 'patient003', name: 'Demo Test Case 3: patient003 (DCM - Dilated Cardiomyopathy)', group: 'DCM' },
  ];

  const handleCompute = async (subjId: string) => {
    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:8000/api/v1/cardiac/compute-quantification/${subjId}`);
      setData(res.data);
      setMessage(`Quantification successfully derived for ${subjId}.`);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to compute cardiac metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCompute(selectedSubject);
  }, [selectedSubject]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Heart className="w-6 h-6 text-red-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Cardiac Quantitative Functional Profiling</h1>
            <p className="text-xs text-muted-foreground">Derive physical volumetric measures (EDV, ESV, SV, EF) strictly from NIfTI affine headers.</p>
          </div>
        </div>

        {/* Demo Test Case Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-medium text-muted-foreground shrink-0">Demo Test Case:</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {demoSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center space-x-3">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Quantitative Measurement Disclaimer:</strong> Research / AI-derived quantitative measurements — not clinical diagnosis.
        </span>
      </div>

      {/* Main Metrics View */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Ventricle Card */}
          <div className="glass-panel p-5 rounded-xl border border-border space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Left Ventricle (LV)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Primary Target
              </span>
            </h2>

            <div className="space-y-2 text-xs font-mono pt-1">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">End-Diastolic Volume (EDV):</span>
                <span className="text-foreground font-bold">{data.metrics.LV.EDV_mL} mL</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">End-Systolic Volume (ESV):</span>
                <span className="text-foreground font-bold">{data.metrics.LV.ESV_mL} mL</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Stroke Volume (SV):</span>
                <span className="text-foreground font-bold">{data.metrics.LV.SV_mL} mL</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-emerald-400 font-semibold">Ejection Fraction (EF %):</span>
                <span className="text-emerald-400 font-bold text-sm">{data.metrics.LV.EF_percent}%</span>
              </div>
            </div>
          </div>

          {/* Right Ventricle Card */}
          <div className="glass-panel p-5 rounded-xl border border-border space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Right Ventricle (RV)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                Crescent Anatomy
              </span>
            </h2>

            <div className="space-y-2 text-xs font-mono pt-1">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">End-Diastolic Volume (EDV):</span>
                <span className="text-foreground font-bold">{data.metrics.RV.EDV_mL} mL</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">End-Systolic Volume (ESV):</span>
                <span className="text-foreground font-bold">{data.metrics.RV.ESV_mL} mL</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Stroke Volume (SV):</span>
                <span className="text-foreground font-bold">{data.metrics.RV.SV_mL} mL</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-cyan-400 font-semibold">Ejection Fraction (EF %):</span>
                <span className="text-cyan-400 font-bold text-sm">{data.metrics.RV.EF_percent}%</span>
              </div>
            </div>
          </div>

          {/* Myocardium Card */}
          <div className="glass-panel p-5 rounded-xl border border-border space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Myocardium (MYO)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                Ring Structure
              </span>
            </h2>

            <div className="space-y-2 text-xs font-mono pt-1">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Myocardial Mass:</span>
                <span className="text-foreground font-bold">{data.metrics.Myocardium.Mass_g} g</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Max Wall Thickness:</span>
                <span className="text-foreground font-bold">{data.metrics.Myocardium.MaxThickness_mm} mm</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Tissue Density:</span>
                <span className="text-foreground font-bold">1.05 g/mL</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-amber-400 font-semibold">Voxel Spacing:</span>
                <span className="text-amber-400 font-bold text-xs">{data.voxel_spacing_mm.join(' x ')} mm</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

