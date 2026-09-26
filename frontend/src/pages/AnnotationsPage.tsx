import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PenTool, Brush, Eraser, Trash2, Save, ChevronLeft, ChevronRight, Eye, EyeOff, Info, Cpu, RefreshCw } from 'lucide-react';
import axios from 'axios';

// ── Types ────────────────────────────────────────────────────────────────────
interface SubjectEntry {
  subject_id: string;
  source: string;
  label: string;
  ed_frame: string;
  es_frame: string;
  group: string | null;
}

interface Stroke {
  x: number; y: number; radius: number;
  label: number; tool: 'brush' | 'eraser';
}

const LABELS = [
  { value: 1, name: 'RV (Right Ventricle)',  color: '#22d3ee', fill: 'rgba(34,211,238,0.55)' },
  { value: 2, name: 'MYO (Myocardium)',       color: '#f59e0b', fill: 'rgba(245,158,11,0.55)'  },
  { value: 3, name: 'LV (Left Ventricle)',    color: '#ef4444', fill: 'rgba(239,68,68,0.55)'   },
];

const AXES = ['axial', 'coronal', 'sagittal'] as const;
type Axis = typeof AXES[number];

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ── Component ────────────────────────────────────────────────────────────────
export const AnnotationsPage: React.FC = () => {
  const [subjects, setSubjects]       = useState<SubjectEntry[]>([]);
  const [subjectId, setSubjectId]     = useState<string>('');
  const [frame, setFrame]             = useState<string>('frame01');
  const [axis, setAxis]               = useState<Axis>('axial');
  const [sliceIdx, setSliceIdx]       = useState<number>(5);
  const [nSlices, setNSlices]         = useState<number>(10);
  const [activeLabel, setActiveLabel] = useState<number>(3);
  const [brushRadius, setBrushRadius] = useState<number>(12);
  const [activeTool, setActiveTool]   = useState<'brush' | 'eraser'>('brush');
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [saving, setSaving]           = useState<boolean>(false);
  const [saveMsg, setSaveMsg]         = useState<string | null>(null);
  const [imgUrl, setImgUrl]           = useState<string | null>(null);
  const [imgLoading, setImgLoading]   = useState<boolean>(false);
  const [aiSegmenting, setAiSegmenting] = useState<boolean>(false);
  const [aiWeightsLoaded, setAiWeightsLoaded] = useState<boolean | null>(null);
  const aiPredRef = useRef<number[][] | null>(null); // (H, W) label grid from AI

  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const overlayRef    = useRef<HTMLCanvasElement>(null);
  const imgRef        = useRef<HTMLImageElement | null>(null);
  const strokesRef    = useRef<Stroke[]>([]);
  const drawingRef    = useRef<boolean>(false);
  const lastPosRef    = useRef<{x:number;y:number} | null>(null);

  // Load subjects
  useEffect(() => {
    axios.get('/api/v1/viewer/subjects').then(r => {
      setSubjects(r.data);
      if (r.data.length > 0) setSubjectId(r.data[0].subject_id);
    }).catch(() => {});
  }, []);

  // Load slice info when subject/frame changes
  useEffect(() => {
    if (!subjectId || !frame) return;
    axios.get(`/api/v1/annotations/slice-info/${subjectId}/${frame}`)
      .then(r => {
        const key = axis === 'axial' ? 'n_axial' : axis === 'coronal' ? 'n_coronal' : 'n_sagittal';
        const n = r.data[key] ?? 10;
        setNSlices(n);
        setSliceIdx(Math.floor(n / 2));
      })
      .catch(() => setNSlices(10));
  }, [subjectId, frame, axis]);

  // Load MRI slice image
  useEffect(() => {
    if (!subjectId || !frame) return;
    setImgLoading(true);
    const url = `/api/v1/annotations/slice/${subjectId}/${frame}/${axis}/${sliceIdx}`;
    setImgUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      imgRef.current = img;
      setImgLoading(false);
      renderBase();
    };
    img.onerror = () => setImgLoading(false);
  }, [subjectId, frame, axis, sliceIdx]);

  // Load saved annotations when slice changes
  useEffect(() => {
    if (!subjectId || !frame) return;
    strokesRef.current = [];
    axios.get(`/api/v1/annotations/load/${subjectId}/${frame}/${axis}/${sliceIdx}`)
      .then(r => {
        // r.data is array of {label, strokes, canvas_width, canvas_height}
        const all: Stroke[] = [];
        for (const set of r.data) {
          for (const s of set.strokes) {
            all.push({ ...s, label: set.label, tool: 'brush' });
          }
        }
        strokesRef.current = all;
        renderOverlay();
      })
      .catch(() => {});
  }, [subjectId, frame, axis, sliceIdx]);

  const renderBase = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    if (overlayRef.current) {
      overlayRef.current.width  = img.naturalWidth;
      overlayRef.current.height = img.naturalHeight;
    }
    ctx.drawImage(img, 0, 0);
    renderOverlay();
  }, []);

  const renderOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!showOverlay) return;

    // Render AI prediction grid as semi-transparent fill
    if (aiPredRef.current) {
      const pred = aiPredRef.current;
      const pH = pred.length, pW = pred[0]?.length ?? 0;
      if (pH > 0 && pW > 0) {
        const cellH = canvas.height / pH, cellW = canvas.width / pW;
        const AI_COLORS: Record<number, string> = {
          1: 'rgba(34,211,238,0.30)',   // RV cyan
          2: 'rgba(245,158,11,0.30)',   // MYO amber
          3: 'rgba(239,68,68,0.30)',    // LV red
        };
        for (let r = 0; r < pH; r++) {
          for (let c = 0; c < pW; c++) {
            const v = pred[r][c];
            if (v === 0) continue;
            ctx.fillStyle = AI_COLORS[v] ?? 'rgba(255,255,255,0.15)';
            ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }
    }

    for (const s of strokesRef.current) {
      const label = LABELS.find(l => l.value === s.label);
      if (!label) continue;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = label.fill;
      ctx.fill();
    }
  }, [showOverlay]);

  // Re-render overlay when showOverlay changes
  useEffect(() => { renderOverlay(); }, [showOverlay, renderOverlay]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = overlayRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    let cx: number, cy: number;
    if ('touches' in e) {
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    return {
      x: (cx - rect.left) * scaleX,
      y: (cy - rect.top)  * scaleY,
    };
  };

  const applyStroke = (x: number, y: number) => {
    if (activeTool === 'eraser') {
      strokesRef.current = strokesRef.current.filter(s =>
        Math.hypot(s.x - x, s.y - y) > s.radius + brushRadius
      );
    } else {
      strokesRef.current.push({ x, y, radius: brushRadius, label: activeLabel, tool: 'brush' });
    }
    renderOverlay();
  };

  const onPointerDown = (e: React.MouseEvent) => {
    drawingRef.current = true;
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
    applyStroke(pos.x, pos.y);
  };

  const onPointerMove = (e: React.MouseEvent) => {
    if (!drawingRef.current) return;
    const pos = getCanvasPos(e);
    // Interpolate for smooth strokes
    const last = lastPosRef.current;
    if (last) {
      const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
      const steps = Math.max(1, Math.floor(dist / (brushRadius * 0.5)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        applyStroke(last.x + (pos.x - last.x) * t, last.y + (pos.y - last.y) * t);
      }
    }
    lastPosRef.current = pos;
  };

  const onPointerUp = () => { drawingRef.current = false; lastPosRef.current = null; };

  const handleSave = async () => {
    const canvas = overlayRef.current;
    if (!canvas || strokesRef.current.length === 0) return;
    setSaving(true);
    try {
      await axios.post('/api/v1/annotations/save-stroke', {
        subject_id: subjectId,
        frame,
        axis,
        slice_idx: sliceIdx,
        label: activeLabel,
        strokes: strokesRef.current,
        canvas_width: canvas.width,
        canvas_height: canvas.height,
        note: `Manual brush annotation — ${subjectId} ${frame} ${axis} slice ${sliceIdx}`,
      });
      setSaveMsg(`Saved ${strokesRef.current.length} brush marks`);
      setTimeout(() => setSaveMsg(null), 2500);
    } catch {
      setSaveMsg('Save failed — check backend connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    strokesRef.current = [];
    renderOverlay();
    await axios.delete(`/api/v1/annotations/clear/${subjectId}/${frame}/${axis}/${sliceIdx}`).catch(() => {});
    setSaveMsg('Cleared');
    setTimeout(() => setSaveMsg(null), 1200);
  };

  const selectedSubject = subjects.find(s => s.subject_id === subjectId);

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PenTool className="w-5 h-5 text-purple-400" />
            Annotation Workspace
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            2D slice brush annotation — RV · MYO · LV labels · ACDC short-axis cardiac MRI
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          Research prototype — annotations are stored locally, not for clinical use
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* ── LEFT: Controls ── */}
        <div className="xl:col-span-1 space-y-4">

          {/* Subject */}
          <div className="glass-panel rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">Subject</p>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-lg"
            >
              {subjects.map(s => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_id} {s.source === 'acdc' ? `[ACDC${s.group ? ' ' + s.group : ''}]` : '[SYNTH]'}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Frame</p>
                <select
                  value={frame}
                  onChange={e => setFrame(e.target.value)}
                  className="w-full px-2 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg"
                >
                  {selectedSubject && [
                    { label: `ED (${selectedSubject.ed_frame})`, val: selectedSubject.ed_frame },
                    { label: `ES (${selectedSubject.es_frame})`, val: selectedSubject.es_frame },
                  ].map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Axis</p>
                <select
                  value={axis}
                  onChange={e => setAxis(e.target.value as Axis)}
                  className="w-full px-2 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg capitalize"
                >
                  {AXES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Slice slider */}
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Slice</span>
                <span className="font-mono font-bold text-foreground">{sliceIdx + 1} / {nSlices}</span>
              </div>
              <input
                type="range" min={0} max={Math.max(0, nSlices - 1)} value={sliceIdx}
                onChange={e => setSliceIdx(+e.target.value)}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between mt-1.5 gap-1">
                <button onClick={() => setSliceIdx(i => clamp(i - 1, 0, nSlices - 1))}
                  className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] border border-border rounded hover:bg-card/60 transition-colors">
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <button onClick={() => setSliceIdx(i => clamp(i + 1, 0, nSlices - 1))}
                  className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] border border-border rounded hover:bg-card/60 transition-colors">
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Tools */}
          <div className="glass-panel rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">Tools</p>
            <div className="flex gap-2">
              {([
                { id: 'brush', Icon: Brush, label: 'Brush' },
                { id: 'eraser', Icon: Eraser, label: 'Eraser' },
              ] as const).map(({ id, Icon, label }) => (
                <button key={id} onClick={() => setActiveTool(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    activeTool === id
                      ? 'bg-purple-600/20 border-purple-500/60 text-purple-300'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-card/40'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Brush radius</span>
                <span className="font-mono font-bold text-foreground">{brushRadius}px</span>
              </div>
              <input type="range" min={3} max={40} value={brushRadius}
                onChange={e => setBrushRadius(+e.target.value)}
                className="w-full accent-purple-500" />
            </div>

            <button onClick={() => setShowOverlay(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-1.5 text-xs border border-border rounded-lg hover:bg-card/60 transition-colors">
              {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showOverlay ? 'Overlay visible' : 'Overlay hidden'}
            </button>
          </div>

          {/* AI Segment */}
          <div className="glass-panel rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" /> AI Segment
            </p>
            <p className="text-[10px] text-muted-foreground">
              Run MONAI U-Net on this slice. Prediction overlays in transparent color.
            </p>
            <button
              onClick={async () => {
                if (!subjectId || !frame) return;
                setAiSegmenting(true);
                try {
                  const frameNum = frame.replace(/[^0-9]/g, '') || '1';
                  const r = await axios.get(
                    `/api/v1/annotations/ai-segment/${subjectId}/${frameNum}/${axis}/${sliceIdx}`
                  );
                  aiPredRef.current = r.data.labels;
                  setAiWeightsLoaded(r.data.weights_loaded);
                  renderOverlay();
                } catch (e: any) {
                  console.error('AI segment failed', e);
                } finally {
                  setAiSegmenting(false);
                }
              }}
              disabled={aiSegmenting || !subjectId}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-violet-600/20 border border-violet-500/40 text-violet-300 rounded-lg hover:bg-violet-600/30 transition-colors disabled:opacity-50">
              {aiSegmenting
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Segmenting…</>
                : <><Cpu className="w-3.5 h-3.5" />AI Segment</>}
            </button>
            {aiWeightsLoaded === false && (
              <p className="text-[10px] text-amber-400/80">
                Random-weight prediction (no checkpoint). Train model first for meaningful results.
              </p>
            )}
            {aiWeightsLoaded === true && (
              <p className="text-[10px] text-emerald-400/80">Trained model weights loaded.</p>
            )}
            {aiPredRef.current && (
              <button onClick={() => { aiPredRef.current = null; renderOverlay(); }}
                className="w-full py-1 text-[10px] text-muted-foreground border border-border/40 rounded hover:bg-card/40 transition-colors">
                Clear AI overlay
              </button>
            )}
          </div>

          {/* Label selector */}
          <div className="glass-panel rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground mb-1">Active Label</p>
            {LABELS.map(l => (
              <button key={l.value} onClick={() => setActiveLabel(l.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-colors ${
                  activeLabel === l.value
                    ? 'border-opacity-80 bg-opacity-15'
                    : 'border-border bg-background/20 hover:bg-card/40'
                }`}
                style={activeLabel === l.value ? { borderColor: l.color + 'aa', backgroundColor: l.color + '22' } : {}}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                <span style={{ color: activeLabel === l.value ? l.color : undefined }}>{l.name}</span>
              </button>
            ))}
            <div className="mt-2 pt-2 border-t border-border/40 text-[9px] text-muted-foreground space-y-0.5">
              <p>Label convention (ACDC):</p>
              <p>0 = Background · 1 = RV · 2 = MYO · 3 = LV</p>
            </div>
          </div>

          {/* Save / Clear */}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-border hover:bg-card/60 text-xs rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          {saveMsg && (
            <div className="text-center text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2">
              {saveMsg}
            </div>
          )}
        </div>

        {/* ── RIGHT: Canvas ── */}
        <div className="xl:col-span-3">
          <div className="glass-panel rounded-xl border border-border overflow-hidden bg-black/60 relative"
            style={{ minHeight: '520px' }}>

            {/* Canvas header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/30 text-[10px] text-muted-foreground">
              <span className="font-mono font-bold text-foreground">{subjectId}</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 capitalize">{axis}</span>
              <span>Slice {sliceIdx + 1}/{nSlices}</span>
              <span>{frame}</span>
              <span className="ml-auto text-[9px]">{strokesRef.current.length} marks</span>
            </div>

            {/* MRI + Overlay stacked canvases */}
            <div className="relative flex items-center justify-center p-2" style={{ minHeight: '460px' }}>
              {imgLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                </div>
              )}
              {!imgLoading && !imgUrl && (
                <p className="text-xs text-muted-foreground">Select a subject to begin annotating</p>
              )}
              {imgUrl && (
                <div className="relative" style={{ display: 'inline-block', maxWidth: '100%', maxHeight: '560px' }}>
                  {/* Base MRI image */}
                  <canvas ref={canvasRef}
                    style={{ display: 'block', maxWidth: '100%', maxHeight: '560px', imageRendering: 'pixelated' }} />
                  {/* Annotation overlay */}
                  <canvas ref={overlayRef}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      maxWidth: '100%', maxHeight: '560px',
                      cursor: activeTool === 'eraser' ? 'crosshair' : 'crosshair',
                      imageRendering: 'pixelated',
                    }}
                    onMouseDown={onPointerDown}
                    onMouseMove={onPointerMove}
                    onMouseUp={onPointerUp}
                    onMouseLeave={onPointerUp}
                  />
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-border/40 bg-card/20 text-[9px] text-muted-foreground flex items-center justify-between">
              <span>Click & drag to paint · Choose label on left · Save preserves strokes per slice</span>
              <span className="flex items-center gap-2">
                {LABELS.map(l => (
                  <span key={l.value} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                    {l.value}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
