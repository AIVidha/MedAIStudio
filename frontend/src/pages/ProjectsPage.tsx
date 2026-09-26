import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Database, Eye, Heart, BarChart3, Layers, Tag, Activity, Info } from 'lucide-react';
import axios from 'axios';

interface Project {
  id: string;
  name: string;
  description: string | null;
  vertical_id: string;
  anatomy: string;
  modality: string;
  task: string;
}

interface Dataset {
  id: string;
  name: string;
  is_synthetic: boolean;
  num_subjects: number;
  num_studies: number;
  version_tag: string;
}

const VERTICAL_LABELS: Record<string, string> = {
  cardiac_mri: 'Cardiac MRI',
  chest_ct: 'Chest CT',
  brain_mri: 'Brain MRI',
};

export const ProjectsPage: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/v1/projects'),
      axios.get('/api/v1/datasets'),
    ]).then(([projRes, dsRes]) => {
      const projects: Project[] = projRes.data || [];
      setProject(projects[0] ?? null);
      setDatasets(dsRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">Loading project…</div>
    );
  }

  if (!project) {
    return (
      <div className="glass-panel rounded-xl border border-border p-8 text-center space-y-3">
        <FolderKanban className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium text-foreground">No project found</p>
        <p className="text-xs text-muted-foreground">
          Run <code className="font-mono bg-card px-1 py-0.5 rounded">python scripts/seed_demo.py</code> to create the demo project.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
          <FolderKanban className="w-5 h-5 text-blue-400" />
          <span>Project</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-normal">
            {VERTICAL_LABELS[project.vertical_id] ?? project.vertical_id}
          </span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Active research project configuration and dataset associations.</p>
      </div>

      {/* Project card */}
      <div className="glass-panel rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{project.description}</p>
            )}
          </div>
          <span className="text-[11px] px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card/60 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Tag className="w-3 h-3" /> Vertical
            </div>
            <p className="text-sm font-semibold text-foreground">
              {VERTICAL_LABELS[project.vertical_id] ?? project.vertical_id}
            </p>
          </div>

          <div className="bg-card/60 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Heart className="w-3 h-3" /> Anatomy
            </div>
            <p className="text-sm font-semibold text-foreground">{project.anatomy}</p>
          </div>

          <div className="bg-card/60 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Activity className="w-3 h-3" /> Modality
            </div>
            <p className="text-sm font-semibold text-foreground">{project.modality}</p>
          </div>

          <div className="bg-card/60 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Layers className="w-3 h-3" /> Task
            </div>
            <p className="text-sm font-semibold text-foreground">{project.task}</p>
          </div>
        </div>

        <div className="border-t border-border/40 pt-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
            <Info className="w-3 h-3" /> Vertical Config
          </p>
          <p className="text-xs text-muted-foreground font-mono bg-card/60 rounded px-3 py-2">
            configs/verticals/{project.vertical_id}.yaml
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Defines segmentation classes, loss functions, data augmentation, and output schema for this anatomy.
          </p>
        </div>
      </div>

      {/* Datasets */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" /> Associated Datasets
        </h2>

        {datasets.length === 0 ? (
          <div className="glass-panel rounded-xl border border-border p-6 text-center space-y-2">
            <Database className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">No datasets registered yet.</p>
            <Link to="/datasets" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Go to Dataset Manager →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {datasets.map(ds => (
              <div key={ds.id} className="glass-panel rounded-xl border border-border p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{ds.name}</p>
                    {ds.is_synthetic && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        SYNTHETIC — not real anatomy
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {ds.num_subjects} subjects · {ds.num_studies} studies · version {ds.version_tag}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link to="/viewer" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                    <Eye className="w-3 h-3" /> View
                  </Link>
                  <Link to="/benchmarks" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    <BarChart3 className="w-3 h-3" /> Benchmark
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflow shortcut */}
      <div className="glass-panel rounded-xl border border-border/50 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Recommended Workflow
        </p>
        <ol className="space-y-1.5">
          {[
            ['Import dataset', '/datasets', 'Generate synthetic or import ACDC data'],
            ['View in NiiVue', '/viewer', 'Inspect NIfTI volumes and ground truth overlays'],
            ['Run benchmarks', '/benchmarks', 'Evaluate architectures on test split'],
            ['TOPSIS selection', '/optimization', 'Choose model for deployment profile'],
            ['Deploy ONNX', '/deployments', 'Export and test the inference endpoint'],
          ].map(([step, href, desc], i) => (
            <li key={step} className="flex items-center gap-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
                {i + 1}
              </span>
              <Link to={href} className="text-blue-400 hover:text-blue-300 font-medium transition-colors min-w-[120px]">
                {step}
              </Link>
              <span className="text-muted-foreground">{desc}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
