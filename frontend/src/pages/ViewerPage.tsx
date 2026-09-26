import React, {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import {
  Eye, ChevronLeft, ChevronRight, Play, Pause,
  Layers, ShieldAlert, Database, SunMedium,
  LayoutGrid, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface SliceInfo {
  n_axial: number;
  n_coronal: number;
  n_sagittal: number;
  shape: number[];
}

type Axis = 'axial' | 'coronal' | 'sagittal';

// ── Constants ─────────────────────────────────────────────────────────────────

const GROUP_META: Record<string, { color: string; label: string }> = {
  NOR:  { color: '#34d399', label: 'Normal'                 },
  MINF: { color: '#f87171', label: 'Myocardial Infarction'  },
  DCM:  { color: '#fbbf24', label: 'Dilated Cardiomyopathy' },
  HCM:  { color: '#a78bfa', label: 'Hypertrophic CM'        },
  RV:   { color: '#38bdf8', label: 'RV Abnormality'         },
};

const AXES: Axis[] = ['axial', 'coronal', 'sagittal'];

const AXIS_LABELS: Record<Axis, string> = {
  axial:    'Short-Axis (Axial)',
  coronal:  'Long-Axis (Coronal)',
  sagittal: 'Long-Axis (Sagittal)',
};

// ── MprPanel ──────────────────────────────────────────────────────────────────

interface MprPanelProps {
  subjectId: string;
  frame: string;
  axis: Axis;
  sliceIdx: number;
  nSlices: number;
  overlayVisible: boolean;
  overlayOpacity: number;
  brightness: number;
  contrast: number;
  onSliceChange: (axis: Axis, idx: number) => void;
  onFocus?: () => void;
  focused?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

const MprPanel: React.FC<MprPanelProps> = ({
  subjectId, frame, axis, sliceIdx, nSlices,
  overlayVisible, overlayOpacity, brightness, contrast,
  onSliceChange, onFocus, focused, expanded, onExpand, onCollapse,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseRef      = useRef<HTMLCanvasElement>(null);
  const overlayRef   = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  const draw = useCallback(() => {
    const base = baseRef.current;
    const over = overlayRef.current;
    if (!base || !over || !subjectId || !frame) return;

    const dpr  = window.devicePixelRatio || 1;
    const cssW = base.offsetWidth  || 1;
    const cssH = base.offsetHeight || 1;
    const pxW  = Math.round(cssW * dpr);
    const pxH  = Math.round(cssH * dpr);

    if (base.width !== pxW || base.height !== pxH) {
      base.width = pxW;  base.height = pxH;
      over.width = pxW;  over.height = pxH;
    }

    const bCtx = base.getContext('2d')!;
    const oCtx = over.getContext('2d')!;
    bCtx.clearRect(0, 0, pxW, pxH);
    oCtx.clearRect(0, 0, pxW, pxH);

    setLoading(true);

    const img = new Image();
    img.onload = () => {
      // Contain (letterbox) with a fixed inset so the full image is always clearly bounded
      const PAD = 8; // px inset on each side — ensures image never touches panel edge
      const areaW = cssW - PAD * 2;
      const areaH = cssH - PAD * 2;
      const scale = Math.min(areaW / img.naturalWidth, areaH / img.naturalHeight);
      const dw = img.naturalWidth  * scale;
      const dh = img.naturalHeight * scale;
      const dx = PAD + (areaW - dw) / 2;
      const dy = PAD + (areaH - dh) / 2;

      bCtx.save();
      bCtx.scale(dpr, dpr);
      bCtx.filter = `brightness(${brightness}) contrast(${contrast})`;
      bCtx.drawImage(img, dx, dy, dw, dh);
      bCtx.filter = 'none';
      // Subtle frame to show exact image boundary
      bCtx.strokeStyle = 'rgba(255,255,255,0.12)';
      bCtx.lineWidth = 0.5;
      bCtx.strokeRect(dx, dy, dw, dh);
      bCtx.restore();
      setLoading(false);

      if (overlayVisible) {
        const gt = new Image();
        gt.onload = () => {
          oCtx.save();
          oCtx.scale(dpr, dpr);
          oCtx.globalAlpha = overlayOpacity;
          oCtx.drawImage(gt, dx, dy, dw, dh);
          oCtx.globalAlpha = 1;
          oCtx.restore();
        };
        gt.src = `/api/v1/viewer/gt-slice/${subjectId}/${frame}/${axis}/${sliceIdx}`;
      }
    };
    img.onerror = () => setLoading(false);
    img.src = `/api/v1/viewer/slice/${subjectId}/${frame}/${axis}/${sliceIdx}`;
  }, [subjectId, frame, axis, sliceIdx, overlayVisible, overlayOpacity, brightness, contrast]);

  useLayoutEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const d = e.deltaY > 0 ? 1 : -1;
    onSliceChange(axis, Math.max(0, Math.min(nSlices - 1, sliceIdx + d)));
  };

  return (
    <div
      ref={containerRef}
      onClick={onFocus}
      onWheel={onWheel}
      className={`relative flex flex-col h-full overflow-hidden rounded-lg border cursor-pointer select-none transition-colors
        ${focused ? 'border-emerald-500/70' : 'border-border/50 hover:border-border'}`}
      style={{ background: '#06060e' }}
    >
      {/* Label */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between
                      px-3 py-1 bg-black/60 backdrop-blur-sm">
        <span className="text-[11px] font-mono text-emerald-300/90 pointer-events-none">{AXIS_LABELS[axis]}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground pointer-events-none">{sliceIdx + 1} / {nSlices}</span>
          {expanded ? (
            <button
              onClick={e => { e.stopPropagation(); onCollapse?.(); }}
              className="p-0.5 rounded hover:bg-white/20 text-muted-foreground hover:text-white transition-colors"
              title="Collapse"
            ><Minimize2 className="w-3.5 h-3.5" /></button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onExpand?.(); }}
              className="p-0.5 rounded hover:bg-white/20 text-muted-foreground hover:text-white transition-colors"
              title="Expand panel"
            ><Maximize2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 min-h-0">
        <canvas ref={baseRef} className="absolute inset-0 w-full h-full" />
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] text-muted-foreground/50 font-mono">loading…</span>
          </div>
        )}
      </div>

      {/* Slice nav */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-black/50 border-t border-border/30 shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onSliceChange(axis, Math.max(0, sliceIdx - 1)); }}
          className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        ><ChevronLeft className="w-4 h-4" /></button>
        <input
          type="range" min={0} max={Math.max(0, nSlices - 1)} value={sliceIdx}
          onChange={e => onSliceChange(axis, Number(e.target.value))}
          onClick={e => e.stopPropagation()}
          className="flex-1 h-1.5 accent-emerald-500"
        />
        <button
          onClick={e => { e.stopPropagation(); onSliceChange(axis, Math.min(nSlices - 1, sliceIdx + 1)); }}
          className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        ><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

// ── ViewerPage ─────────────────────────────────────────────────────────────────

export const ViewerPage: React.FC = () => {
  const [subjects, setSubjects]   = useState<SubjectInfo[]>([]);
  const [selected, setSelected]   = useState<SubjectInfo | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'acdc' | 'synthetic'>('all');
  const [groupFilter, setGroupFilter]   = useState<string>('all');

  const [frame, setFrame]         = useState<string>('frame01');
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef(false);

  const [sliceInfo, setSliceInfo] = useState<SliceInfo>({
    n_axial: 10, n_coronal: 160, n_sagittal: 160, shape: [160, 160, 10],
  });
  const [slices, setSlices]       = useState<Record<Axis, number>>({ axial: 4, coronal: 80, sagittal: 80 });
  const [focusedAxis, setFocusedAxis] = useState<Axis>('axial');
  const [layout, setLayout]       = useState<'3up' | 'single'>('3up');
  const [expandedAxis, setExpandedAxis] = useState<Axis | null>(null);
  const [leftCollapsed, setLeftCollapsed]   = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.65);
  const [brightness, setBrightness] = useState(1.0);
  const [contrast, setContrast]     = useState(1.1);

  useEffect(() => {
    axios.get('/api/v1/viewer/subjects').then(r => {
      setSubjects(r.data);
      if (r.data.length > 0) selectSubject(r.data[0]);
    });
  }, []);

  const selectSubject = (s: SubjectInfo) => {
    setSelected(s);
    setFrame(s.ed_frame);
    setIsPlaying(false);
    playRef.current = false;
  };

  useEffect(() => {
    if (!selected || !frame) return;
    axios.get(`/api/v1/viewer/slice-info/${selected.subject_id}/${frame}`)
      .then(r => {
        const info: SliceInfo = r.data;
        setSliceInfo(info);
        setSlices({
          axial:    Math.floor(info.n_axial    / 2),
          coronal:  Math.floor(info.n_coronal  / 2),
          sagittal: Math.floor(info.n_sagittal / 2),
        });
      })
      .catch(() => {});
  }, [selected, frame]);

  useEffect(() => {
    if (!isPlaying || !selected) return;
    playRef.current = true;
    let cur = frame === selected.ed_frame ? 0 : 1;
    const frames = [selected.ed_frame, selected.es_frame];
    const id = setInterval(() => {
      if (!playRef.current) { clearInterval(id); return; }
      cur = (cur + 1) % frames.length;
      setFrame(frames[cur]);
    }, 550);
    return () => { clearInterval(id); playRef.current = false; };
  }, [isPlaying, selected]);

  const handleSliceChange = useCallback((axis: Axis, idx: number) => {
    setSlices(prev => ({ ...prev, [axis]: idx }));
  }, []);

  const filteredSubjects = subjects.filter(s => {
    if (sourceFilter !== 'all' && s.source !== sourceFilter) return false;
    if (groupFilter !== 'all' && s.group !== groupFilter) return false;
    return true;
  });

  const nSlicesFor = (axis: Axis): number =>
    ({ axial: sliceInfo.n_axial, coronal: sliceInfo.n_coronal, sagittal: sliceInfo.n_sagittal }[axis]);

  const groups = [...new Set(subjects.map(s => s.group).filter(Boolean))] as string[];

  const panelProps = (axis: Axis): MprPanelProps => ({
    subjectId:     selected?.subject_id ?? '',
    frame,
    axis,
    sliceIdx:      slices[axis],
    nSlices:       nSlicesFor(axis),
    overlayVisible,
    overlayOpacity,
    brightness,
    contrast,
    onSliceChange: handleSliceChange,
    onFocus:       () => setFocusedAxis(axis),
    focused:       focusedAxis === axis,
    expanded:      expandedAxis === axis,
    onExpand:      () => { setExpandedAxis(axis); setFocusedAxis(axis); },
    onCollapse:    () => setExpandedAxis(null),
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // Escape the parent's p-6 padding and fill all space below banner+header
    <div className="-mx-6 -mt-6 -mb-6 flex flex-col" style={{ height: 'calc(100vh - 92px)' }}>

      {/* ── Compact header row ── */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 shrink-0 border-b border-border/50 bg-card/30">
        <div className="flex items-center gap-2.5">
          <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
          <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">NIfTI Viewer</h1>
          <span className="text-[11px] text-muted-foreground">
            {subjects.filter(s => s.source === 'acdc').length} ACDC + {subjects.filter(s => s.source === 'synthetic').length} synthetic
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selected && (
            <div className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border ${
              selected.source === 'acdc'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              <Database className="w-3 h-3 shrink-0" />
              {selected.source === 'acdc' ? 'ACDC — Bernard et al. 2018 — de-identified' : 'SYNTHETIC — not real anatomy'}
            </div>
          )}
          <button onClick={() => setLayout('3up')}
            className={`p-1.5 rounded-lg border transition-colors ${layout === '3up' ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300' : 'border-border text-muted-foreground hover:text-foreground'}`}
            title="3-panel MPR">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setLayout('single')}
            className={`p-1.5 rounded-lg border transition-colors ${layout === 'single' ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300' : 'border-border text-muted-foreground hover:text-foreground'}`}
            title="Single view">
            <Maximize2 className="w-4 h-4" />
          </button>
          {/* Collapse toggles */}
          <button onClick={() => setLeftCollapsed(v => !v)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            title={leftCollapsed ? 'Show subject list' : 'Hide subject list'}>
            {leftCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <button onClick={() => setRightCollapsed(v => !v)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            title={rightCollapsed ? 'Show controls' : 'Hide controls'}>
            {rightCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Body: subject list | canvas | controls — all fill remaining height ── */}
      <div className="flex gap-0 flex-1 min-h-0">

        {/* ── Subject list ── */}
        {!leftCollapsed && <div className="w-48 shrink-0 flex flex-col gap-2 min-h-0 border-r border-border/50 p-2">
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as any)}
            className="w-full px-2 py-1.5 bg-background border border-border text-foreground text-[11px] rounded-lg shrink-0">
            <option value="all">All sources ({subjects.length})</option>
            <option value="acdc">ACDC ({subjects.filter(s => s.source === 'acdc').length})</option>
            <option value="synthetic">Synthetic ({subjects.filter(s => s.source === 'synthetic').length})</option>
          </select>
          <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-background border border-border text-foreground text-[11px] rounded-lg shrink-0">
            <option value="all">All groups</option>
            {groups.map(g => <option key={g} value={g}>{g} — {GROUP_META[g]?.label ?? g}</option>)}
          </select>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredSubjects.map(s => (
              <button key={s.subject_id} onClick={() => selectSubject(s)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] transition-colors border ${
                  selected?.subject_id === s.subject_id
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-foreground'
                    : 'border-transparent hover:bg-card/60 text-muted-foreground hover:text-foreground'
                }`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono truncate">{s.subject_id}</span>
                  {s.group && (
                    <span className="shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded"
                      style={{ color: GROUP_META[s.group]?.color ?? '#999', background: (GROUP_META[s.group]?.color ?? '#999') + '22' }}>
                      {s.group}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground/50">{s.source === 'acdc' ? 'ACDC' : 'SYN'}</span>
              </button>
            ))}
          </div>
        </div>}

        {/* ── Canvas area — fills all remaining width and height ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col p-2">
          {layout === '3up' ? (
            expandedAxis ? (
              // One panel expanded to fill the full canvas area
              <div className="flex-1 min-h-0">
                <MprPanel {...panelProps(expandedAxis)} />
              </div>
            ) : (
              // Axial full-width on top; coronal + sagittal side-by-side below
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                {/* Axial — top row, full width */}
                <div className="flex-[3] min-h-0">
                  <MprPanel {...panelProps('axial')} />
                </div>
                {/* Long-axis row — coronal left, sagittal right */}
                <div className="flex-[2] min-h-0 flex flex-row gap-2">
                  <div className="flex-1 min-w-0 min-h-0">
                    <MprPanel {...panelProps('coronal')} />
                  </div>
                  <div className="flex-1 min-w-0 min-h-0">
                    <MprPanel {...panelProps('sagittal')} />
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <div className="flex gap-1 shrink-0">
                {AXES.map(a => (
                  <button key={a} onClick={() => setFocusedAxis(a)}
                    className={`px-3 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                      focusedAxis === a
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}>
                    {AXIS_LABELS[a]}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0">
                <MprPanel {...panelProps(focusedAxis)} />
              </div>
            </div>
          )}
        </div>

        {/* ── Controls ── */}
        {!rightCollapsed && <div className="w-60 shrink-0 flex flex-col gap-3 min-h-0 overflow-y-auto border-l border-border/50 p-3">

          {/* Frame controls */}
          <div className="glass-panel p-3 rounded-xl border border-border space-y-2 shrink-0">
            <p className="text-xs font-semibold text-foreground">Frame</p>
            <div className="grid grid-cols-2 gap-1.5">
              {selected && [
                { key: selected.ed_frame, label: 'ED' },
                { key: selected.es_frame, label: 'ES' },
              ].map(({ key, label }) => (
                <button key={key}
                  onClick={() => { setFrame(key); setIsPlaying(false); }}
                  className={`py-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                    frame === key
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-card/40'
                  }`}>
                  {label}
                  <span className="block text-[9px] font-mono font-normal opacity-60 mt-0.5">{key}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setIsPlaying(p => !p)}
              className="w-full flex items-center justify-center gap-2 py-2 text-[11px] font-semibold bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors">
              {isPlaying ? <><Pause className="w-3.5 h-3.5" /> Pause Cine</> : <><Play className="w-3.5 h-3.5" /> Play Cine (ED↔ES)</>}
            </button>
          </div>

          {/* GT Overlay */}
          <div className="glass-panel p-3 rounded-xl border border-border space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" /> GT Overlay
              </p>
              <button onClick={() => setOverlayVisible(v => !v)}
                className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-colors ${
                  overlayVisible
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'border-border text-muted-foreground'
                }`}>
                {overlayVisible ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="flex gap-3">
              {[{ label: 'RV', color: '#22d3ee' }, { label: 'MYO', color: '#facc15' }, { label: 'LV', color: '#ef4444' }]
                .map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                    {label}
                  </div>
                ))}
            </div>
            <label className="block space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Opacity</span>
                <span className="font-mono text-foreground">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <input type="range" min={0.1} max={1} step={0.05} value={overlayOpacity}
                onChange={e => setOverlayOpacity(Number(e.target.value))}
                className="w-full accent-purple-500" />
            </label>
          </div>

          {/* Windowing */}
          <div className="glass-panel p-3 rounded-xl border border-border space-y-2.5 shrink-0">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-amber-400" /> Windowing
            </p>
            <label className="block space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Brightness</span>
                <span className="font-mono text-foreground">{brightness.toFixed(1)}×</span>
              </div>
              <input type="range" min={0.3} max={2.0} step={0.05} value={brightness}
                onChange={e => setBrightness(Number(e.target.value))}
                className="w-full accent-amber-500" />
            </label>
            <label className="block space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Contrast</span>
                <span className="font-mono text-foreground">{contrast.toFixed(1)}×</span>
              </div>
              <input type="range" min={0.5} max={2.5} step={0.05} value={contrast}
                onChange={e => setContrast(Number(e.target.value))}
                className="w-full accent-amber-500" />
            </label>
            <button onClick={() => { setBrightness(1.0); setContrast(1.1); }}
              className="w-full text-[10px] py-1 border border-border/50 rounded text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors">
              Reset
            </button>
          </div>

          {/* Subject metadata */}
          {selected && (
            <div className="glass-panel p-3 rounded-xl border border-border space-y-2 shrink-0">
              <p className="text-xs font-semibold text-foreground">Subject</p>
              <div className="space-y-1.5">
                {([
                  ['ID',     selected.subject_id],
                  ['Source', selected.source === 'acdc' ? 'ACDC' : 'Synthetic'],
                  ['Group',  selected.group ?? '—'],
                  ['Height', selected.height_cm ? `${selected.height_cm} cm` : '—'],
                  ['Weight', selected.weight_kg ? `${selected.weight_kg} kg` : '—'],
                  ['ED',     selected.ed_frame],
                  ['ES',     selected.es_frame],
                  ['Shape',  sliceInfo.shape.join(' × ')],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-border/30 pb-1 text-[11px]">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-mono text-right truncate"
                      style={k === 'Group' && selected.group ? { color: GROUP_META[selected.group]?.color } : { color: 'inherit' }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-300/90 shrink-0">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400 mb-1">
              <ShieldAlert className="w-3 h-3 shrink-0" /> Research Only
            </div>
            <p className="leading-tight">AI-derived measurements — not clinical diagnosis.</p>
            {selected?.source === 'acdc' && (
              <p className="text-blue-300/80 leading-tight mt-1">ACDC: Bernard O. et al. IEEE TMI 2018.</p>
            )}
          </div>

        </div>}
      </div>
    </div>
  );
};
