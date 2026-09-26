import React, { useEffect, useRef, useState } from 'react';
import { Eye, Sliders, Info, ShieldAlert, Database } from 'lucide-react';
import { Niivue } from '@niivue/niivue';
import axios from 'axios';

interface SubjectInfo {
  subject_id: string;
  source: 'synthetic' | 'acdc';
  label: string;
  ed_frame: string;
  es_frame: string;
  group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
}

export const ViewerPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<Niivue | null>(null);

  const [sliceIndex, setSliceIndex] = useState<number>(4);
  const [maxSlices] = useState<number>(8);
  const [frameMode, setFrameMode] = useState<'ed' | 'es'>('ed');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'synthetic' | 'acdc'>('all');

  useEffect(() => {
    axios.get('/api/v1/viewer/subjects').then(r => {
      const data: SubjectInfo[] = r.data;
      setSubjects(data);
      if (data.length > 0) setSelectedSubject(data[0]);
    }).catch(() => {});
  }, []);

  // Cine playback: toggle between ED and ES
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setFrameMode(prev => prev === 'ed' ? 'es' : 'ed');
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!canvasRef.current || !selectedSubject) return;

    const nv = new Niivue({
      show3Dcrosshair: true,
      backColor: [0.05, 0.05, 0.08, 1],
    });

    nv.attachToCanvas(canvasRef.current);
    nv.setSliceType(2); // Axial
    nvRef.current = nv;

    const frame = frameMode === 'ed' ? selectedSubject.ed_frame : selectedSubject.es_frame;
    const sid = selectedSubject.subject_id;
    const volumeUrl = `/api/v1/viewer/nifti/${sid}/${sid}_${frame}.nii.gz`;
    const volumeUrlNii = `/api/v1/viewer/nifti/${sid}/${sid}_${frame}.nii`;
    const overlayUrlGz = `/api/v1/viewer/nifti/${sid}/${sid}_${frame}_gt.nii.gz`;
    const overlayUrlNii = `/api/v1/viewer/nifti/${sid}/${sid}_${frame}_gt.nii`;

    // Try .nii.gz first, fall back to .nii for ACDC
    const tryLoad = async () => {
      // Check which format exists by trying HEAD
      let vol = volumeUrl;
      let overlay = overlayUrlGz;
      if (selectedSubject.source === 'acdc') {
        vol = volumeUrlNii;
        overlay = overlayUrlNii;
      }
      await nv.loadVolumes([
        { url: vol, colorMap: 'gray', opacity: 1 },
        { url: overlay, colorMap: 'red', opacity: overlayOpacity },
      ]).catch(() => {
        // Try alternate extension
        nv.loadVolumes([
          { url: vol.endsWith('.gz') ? vol.slice(0, -3) : vol + '.gz', colorMap: 'gray', opacity: 1 },
        ]).catch(() => {});
      });
    };
    tryLoad();

    return () => {
      try { nv.closeDrawing?.(); } catch (_) {}
    };
  }, [selectedSubject, frameMode]);

  const handleOpacityChange = (val: number) => {
    setOverlayOpacity(val);
    if (nvRef.current && nvRef.current.volumes.length > 1) {
      nvRef.current.setOpacity(1, val);
      nvRef.current.updateGLVolume();
    }
  };

  const filteredSubjects = subjects.filter(s =>
    sourceFilter === 'all' || s.source === sourceFilter
  );

  const GROUP_COLORS: Record<string, string> = {
    NOR: 'text-emerald-400',
    MINF: 'text-red-400',
    DCM: 'text-amber-400',
    HCM: 'text-purple-400',
    RV: 'text-cyan-400',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Eye className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">NiiVue WebGL Medical Image Viewer</h1>
            <p className="text-xs text-muted-foreground">
              Cardiac MRI slice browser — {subjects.filter(s => s.source === 'synthetic').length} synthetic + {subjects.filter(s => s.source === 'acdc').length} real ACDC subjects
            </p>
          </div>
        </div>

        {/* Source filter + subject selector */}
        <div className="flex items-center gap-2">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value as any)}
            className="px-2 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg"
          >
            <option value="all">All Sources ({subjects.length})</option>
            <option value="synthetic">Synthetic ({subjects.filter(s => s.source === 'synthetic').length})</option>
            <option value="acdc">ACDC Real ({subjects.filter(s => s.source === 'acdc').length})</option>
          </select>
          <select
            value={selectedSubject?.subject_id ?? ''}
            onChange={e => {
              const s = subjects.find(x => x.subject_id === e.target.value);
              if (s) { setSelectedSubject(s); setFrameMode('ed'); }
            }}
            className="px-3 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg font-mono"
          >
            {filteredSubjects.map(s => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.subject_id} {s.group ? `(${s.group})` : ''} [{s.source === 'acdc' ? 'ACDC' : 'SYN'}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Source badge */}
      {selectedSubject && (
        <div className={`flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg border w-fit ${
          selectedSubject.source === 'acdc'
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
        }`}>
          <Database className="w-3.5 h-3.5 shrink-0" />
          {selectedSubject.source === 'acdc'
            ? 'ACDC (Bernard et al. 2018) — real de-identified cardiac MRI research data'
            : 'SYNTHETIC — procedurally generated, not real anatomy'}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-3 glass-panel p-4 rounded-xl border border-border flex flex-col space-y-4">
          <div className="relative aspect-square sm:aspect-[4/3] bg-black/90 rounded-lg overflow-hidden border border-border/80 flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />

            <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/70 border border-white/10 text-[10px] font-mono text-emerald-300 flex items-center space-x-2 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>WebGL2 Viewer | {selectedSubject?.source === 'acdc' ? 'Real ACDC NIfTI' : 'Synthetic NIfTI'}</span>
            </div>

            <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/70 border border-white/10 text-[10px] font-mono text-cyan-300 backdrop-blur-sm">
              Frame: {frameMode === 'ed' ? 'ED (End-Diastole)' : 'ES (End-Systole)'}
              {selectedSubject && ` — ${frameMode === 'ed' ? selectedSubject.ed_frame : selectedSubject.es_frame}`}
            </div>

            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded bg-black/80 border border-white/10 text-[10px] font-medium text-muted-foreground flex items-center space-x-3 backdrop-blur-sm">
              <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-white">RV (1)</span></span>
              <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><span className="text-white">MYO (2)</span></span>
              <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-white">LV (3)</span></span>
            </div>
          </div>

          {/* Sliders */}
          <div className="p-3 bg-background/50 rounded-lg border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Short-Axis Slice Z-Index</span>
                <span className="font-mono text-foreground">{sliceIndex} / {maxSlices}</span>
              </div>
              <input
                type="range" min="1" max={maxSlices} value={sliceIndex}
                onChange={e => setSliceIndex(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Segmentation Mask Opacity</span>
                <span className="font-mono text-foreground">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.05" value={overlayOpacity}
                onChange={e => handleOpacityChange(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-border space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Frame Controls</span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setFrameMode('ed'); setIsPlaying(false); }}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  frameMode === 'ed'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                ED Frame
              </button>
              <button
                onClick={() => { setFrameMode('es'); setIsPlaying(false); }}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  frameMode === 'es'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                ES Frame
              </button>
            </div>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded-lg transition-colors"
            >
              <span>{isPlaying ? '⏸ Pause Cine' : '▶ Play Cine (ED↔ES)'}</span>
            </button>
          </div>

          {selectedSubject && (
            <div className="glass-panel p-4 rounded-xl border border-border space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
                <Info className="w-4 h-4 text-purple-400" />
                <span>Subject Metadata</span>
              </h2>
              <div className="space-y-2 text-xs font-mono text-muted-foreground">
                {[
                  ['Pseudonym ID', selectedSubject.subject_id],
                  ['Source', selectedSubject.source === 'acdc' ? 'ACDC (Kaggle)' : 'Synthetic'],
                  ['Research Group', selectedSubject.group ?? '—'],
                  ['Height', selectedSubject.height_cm ? `${selectedSubject.height_cm} cm` : '—'],
                  ['Weight', selectedSubject.weight_kg ? `${selectedSubject.weight_kg} kg` : '—'],
                  ['ED Frame', selectedSubject.ed_frame],
                  ['ES Frame', selectedSubject.es_frame],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border/40 pb-1">
                    <span>{k}:</span>
                    <span className={
                      k === 'Research Group' && selectedSubject.group
                        ? GROUP_COLORS[selectedSubject.group] ?? 'text-foreground'
                        : 'text-foreground'
                    }>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300/90 space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-400">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Research Disclaimer</span>
            </div>
            <p className="leading-tight">Research / AI-derived quantitative measurements — not clinical diagnosis.</p>
            {selectedSubject?.source === 'acdc' && (
              <p className="leading-tight text-blue-300/80 mt-1">
                ACDC: Bernard O. et al. IEEE TMI 37(11):2514–2525, 2018.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
