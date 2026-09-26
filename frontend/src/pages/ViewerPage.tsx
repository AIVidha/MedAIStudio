import React, { useEffect, useRef, useState } from 'react';
import { Eye, Layers, Play, Pause, RotateCcw, Sliders, Info, ShieldAlert } from 'lucide-react';
import { Niivue } from '@niivue/niivue';

export const ViewerPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<Niivue | null>(null);

  const [sliceIndex, setSliceIndex] = useState<number>(4);
  const [maxSlices, setMaxSlices] = useState<number>(8);
  const [frameIndex, setFrameIndex] = useState<number>(1); // 1: ED, 8: ES
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5);
  const [selectedSubject, setSelectedSubject] = useState<string>('patient001');

  // Cine playback: cycle between ED (frame 1) and ES (frame 8)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev === 1 ? 8 : 1));
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const nv = new Niivue({
      show3Dcrosshair: true,
      backColor: [0.05, 0.05, 0.08, 1],
    });

    nv.attachToCanvas(canvasRef.current);
    nv.setSliceType(2); // Axial slice view
    nvRef.current = nv;

    // Load synthetic demo NIfTI image & GT mask overlay via API endpoint
    const frame = frameIndex === 8 ? 'frame08' : 'frame01';
    const volumeUrl = `/api/v1/viewer/nifti/${selectedSubject}/${selectedSubject}_${frame}.nii.gz`;
    const overlayUrl = `/api/v1/viewer/nifti/${selectedSubject}/${selectedSubject}_${frame}_gt.nii.gz`;

    nv.loadVolumes([
      { url: volumeUrl, colorMap: 'gray', opacity: 1 },
      { url: overlayUrl, colorMap: 'red', opacity: overlayOpacity }
    ]).catch((err) => {
      console.log('NiiVue WebGL Fallback Mode (Demo Volume simulation)');
    });

    return () => {
      try { nv.closeDrawing?.(); } catch (_) {}
    };
  }, [selectedSubject, frameIndex]);

  const handleOpacityChange = (val: number) => {
    setOverlayOpacity(val);
    if (nvRef.current && nvRef.current.volumes.length > 1) {
      nvRef.current.setOpacity(1, val);
      nvRef.current.updateGLVolume();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Eye className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">NiiVue WebGL Medical Image Viewer</h1>
            <p className="text-xs text-muted-foreground">Interactive short-axis cine MRI slice browser, multi-structure segmentation overlay, and cine playback.</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="patient001">Subject: patient001 (NOR)</option>
            <option value="patient002">Subject: patient002 (NOR)</option>
            <option value="patient003">Subject: patient003 (NOR)</option>
            <option value="patient004">Subject: patient004 (NOR)</option>
            <option value="patient005">Subject: patient005 (NOR)</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Viewer + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas & Playback Viewport */}
        <div className="lg:col-span-3 glass-panel p-4 rounded-xl border border-border flex flex-col space-y-4">
          <div className="relative aspect-square sm:aspect-[4/3] bg-black/90 rounded-lg overflow-hidden border border-border/80 flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />

            {/* Viewport Floating Info Badge */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/70 border border-white/10 text-[10px] font-mono text-emerald-300 flex items-center space-x-2 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>WebGL2 2D/3D Mode | Voxel Spacing: 1.25 x 1.25 x 10.0 mm</span>
            </div>

            {/* Frame Badge */}
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/70 border border-white/10 text-[10px] font-mono text-cyan-300 backdrop-blur-sm">
              Frame: {frameIndex === 1 ? 'ED (End-Diastole)' : 'ES (End-Systole)'}
            </div>

            {/* Label Legend Badge */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded bg-black/80 border border-white/10 text-[10px] font-medium text-muted-foreground flex items-center space-x-3 backdrop-blur-sm">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-white">RV (1)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                <span className="text-white">MYO (2)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-white">LV (3)</span>
              </span>
            </div>
          </div>

          {/* Viewer Slider Controls */}
          <div className="p-3 bg-background/50 rounded-lg border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Slice Scroll */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Short-Axis Slice Z-Index</span>
                <span className="font-mono text-foreground">{sliceIndex} / {maxSlices}</span>
              </div>
              <input
                type="range"
                min="1"
                max={maxSlices}
                value={sliceIndex}
                onChange={(e) => setSliceIndex(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Mask Overlay Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Segmentation Mask Opacity</span>
                <span className="font-mono text-foreground">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => handleOpacityChange(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Side Control & Metadata Panel */}
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-border space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Cine Frame Controls</span>
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFrameIndex(1)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  frameIndex === 1
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Frame 01 (ED)
              </button>
              <button
                onClick={() => setFrameIndex(8)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  frameIndex === 8
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Frame 08 (ES)
              </button>
            </div>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded-lg transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Cine Sequence' : 'Play Cine Sequence'}</span>
            </button>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-border space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Info className="w-4 h-4 text-purple-400" />
              <span>Subject Metadata</span>
            </h2>

            <div className="space-y-2 text-xs font-mono text-muted-foreground">
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span>Pseudonym ID:</span>
                <span className="text-foreground">{selectedSubject}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span>Research Group:</span>
                <span className="text-emerald-400">NOR (Normal)</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span>Height / Weight:</span>
                <span className="text-foreground">175 cm / 70 kg</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span>ED / ES Frames:</span>
                <span className="text-foreground">1 / 8</span>
              </div>
            </div>
          </div>

          {/* Research Metric Disclaimer */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300/90 space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-amber-400">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Quantitative Disclaimer</span>
            </div>
            <p className="leading-tight">Research / AI-derived quantitative measurements — not clinical diagnosis.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

