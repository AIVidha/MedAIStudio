import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PenTool, Eye, Layers, Brush, Square, Wand2, Info, CheckCircle2, AlertCircle } from 'lucide-react';

const STRUCTURES = [
  {
    label: 1,
    name: 'Right Ventricle (RV)',
    color: 'bg-red-400',
    ring: 'ring-red-400/30',
    desc: 'Blood pool of the right ventricle. Typically a crescent-shaped region adjacent to the LV.',
  },
  {
    label: 2,
    name: 'Myocardium (MYO)',
    color: 'bg-amber-400',
    ring: 'ring-amber-400/30',
    desc: 'Muscular wall of the left ventricle. Appears as a ring between the LV blood pool and pericardium.',
  },
  {
    label: 3,
    name: 'Left Ventricle (LV)',
    color: 'bg-blue-400',
    ring: 'ring-blue-400/30',
    desc: 'Blood pool of the left ventricle. Bright circular region at centre of short-axis slice.',
  },
];

const TOOLS = [
  {
    icon: Brush,
    name: 'Brush Tool',
    shortcut: 'B',
    desc: 'Freehand paint segmentation label on each 2D slice. Adjustable radius. Works per-frame.',
  },
  {
    icon: Square,
    name: 'Polygon Tool',
    shortcut: 'P',
    desc: 'Click-to-place vertex polygon for precise boundary tracing. Click first vertex to close.',
  },
  {
    icon: Wand2,
    name: 'AI-Assisted Fill',
    shortcut: 'A',
    desc: 'Propagates model prediction as a draft annotation. Requires a benchmarked model checkpoint.',
  },
  {
    icon: Eye,
    name: 'Overlay Toggle',
    shortcut: 'O',
    desc: 'Show/hide annotation overlay on the NiiVue viewer. Adjustable opacity slider.',
  },
];

const WORKFLOW_STEPS = [
  { step: 1, title: 'Load Subject', desc: 'Select a subject from the Datasets page. ED and ES NIfTI frames are loaded into the viewer.' },
  { step: 2, title: 'Review ED Frame', desc: 'Inspect End-Diastole (frame 01). This is the largest cardiac volume — begin annotation here.' },
  { step: 3, title: 'Annotate Structures', desc: 'Use brush or polygon to label RV (1), MYO (2), and LV (3) per slice, basal to apical.' },
  { step: 4, title: 'Review ES Frame', desc: 'Switch to End-Systole (frame 08). The cavity contracts — smaller radii expected.' },
  { step: 5, title: 'Save & Propagate', desc: 'Save per-subject annotation. Ground truth masks are saved as NIfTI .nii.gz alongside image files.' },
  { step: 6, title: 'QA Review', desc: 'Check Dice overlap against AI-predicted draft. Flag low-confidence slices for re-annotation.' },
];

export const AnnotationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'structures' | 'workflow'>('workspace');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <PenTool className="w-5 h-5 text-purple-400" />
            <span>Annotation Workspace</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono font-normal">
              Phase 5 Roadmap
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            AI-assisted segmentation annotation for short-axis cardiac MRI. Brush, polygon, and AI-fill tools.
          </p>
        </div>
      </div>

      {/* Status notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-amber-300">Interactive annotation tools are on the roadmap</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Ground truth annotations are currently provided by the ACDC challenge dataset and synthetic data generator.
            This workspace documents the intended annotation pipeline and data format.
            See <Link to="/viewer" className="text-blue-400 hover:text-blue-300">NiiVue Viewer</Link> to inspect existing masks.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['workspace', 'structures', 'workflow'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px capitalize ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'workspace' ? 'Tool Palette' : tab === 'structures' ? 'Target Structures' : 'Annotation Workflow'}
          </button>
        ))}
      </div>

      {activeTab === 'workspace' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOOLS.map(({ icon: Icon, name, shortcut, desc }) => (
            <div key={name} className="glass-panel rounded-xl border border-border p-4 flex gap-4">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-purple-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{name}</p>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border font-mono text-muted-foreground">
                    {shortcut}
                  </kbd>
                </div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}

          <div className="glass-panel rounded-xl border border-border/50 p-4 col-span-full">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-3 h-3" /> Annotation Format
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-card/60 rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">File Format</p>
                <p className="text-muted-foreground font-mono">NIfTI-1 (.nii.gz)</p>
                <p className="text-muted-foreground">Uint8 label volume, same affine as image</p>
              </div>
              <div className="bg-card/60 rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">Naming Convention</p>
                <p className="text-muted-foreground font-mono">{'{patient_id}'}_frame{'{nn}'}_gt.nii.gz</p>
                <p className="text-muted-foreground">GT suffix distinguishes from raw MRI</p>
              </div>
              <div className="bg-card/60 rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">Label Map</p>
                <p className="text-muted-foreground">0 = Background</p>
                <p className="text-muted-foreground">1 = RV · 2 = MYO · 3 = LV</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'structures' && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Three cardiac structures are annotated per short-axis slice, matching the ACDC challenge label convention.
          </p>
          {STRUCTURES.map(({ label, name, color, ring, desc }) => (
            <div key={label} className={`glass-panel rounded-xl border border-border p-5 flex gap-5 ring-1 ${ring}`}>
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                  {label}
                </div>
                <div className={`w-0.5 h-12 ${color} opacity-20 rounded`} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  <p className="text-[11px] text-muted-foreground">
                    Ground truth provided by ACDC challenge (CC BY-NC-SA 4.0) and synthetic data generator.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'workflow' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Recommended 6-step annotation pipeline for short-axis cine MRI ground truth production.
          </p>
          <div className="space-y-2">
            {WORKFLOW_STEPS.map(({ step, title, desc }) => (
              <div key={step} className="glass-panel rounded-xl border border-border p-4 flex gap-4">
                <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <Link to="/viewer" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors">
              <Eye className="w-3.5 h-3.5" /> Open NiiVue Viewer to inspect existing annotations
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
