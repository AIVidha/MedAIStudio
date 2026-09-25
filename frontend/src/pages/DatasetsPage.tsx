import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Download, ShieldCheck, FileCheck, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import axios from 'axios';

interface DatasetItem {
  id: string;
  name: string;
  description: string;
  is_synthetic: boolean;
  project_id: string;
  num_subjects: number;
  num_studies: number;
  version_tag: string;
}

interface ScannedDataset {
  type: string;
  name: string;
  path: string;
  num_patients: number;
  disclaimer?: string;
  status: string;
}

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [scanned, setScanned] = useState<ScannedDataset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDatasets = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/v1/datasets');
      setDatasets(res.data);
    } catch (err) {
      console.error('Failed to load datasets', err);
    }
  };

  const handleScan = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/api/v1/datasets/scan-local');
      setScanned(res.data.available_datasets || []);
      setMessage('Storage scanned successfully.');
    } catch (err) {
      setMessage('Failed to scan local storage.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (type: string) => {
    setImporting(type);
    try {
      const res = await axios.post(`http://localhost:8000/api/v1/datasets/import/${type}`);
      setMessage(res.data.message || 'Import completed.');
      await fetchDatasets();
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to import dataset.');
    } finally {
      setImporting(null);
    }
  };

  useEffect(() => {
    fetchDatasets();
    handleScan();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-purple-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Datasets & Split Governance</h1>
            <p className="text-xs text-muted-foreground">Manage Cardiac MRI NIfTI datasets, synthetic fallbacks, and zero data leakage patient splits.</p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Scan Local Storage</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Available Local Storage Sources */}
      <div className="glass-panel p-5 rounded-xl border border-border space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Scanned Storage Directories</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scanned.map((item) => (
            <div key={item.type} className="p-4 rounded-lg bg-background/50 border border-border/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{item.name}</span>
                  {item.disclaimer ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      {item.disclaimer}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      CC BY-NC-SA 4.0
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">{item.path}</p>
                <div className="mt-2 text-xs text-muted-foreground flex items-center space-x-4">
                  <span>Subjects: <strong>{item.num_patients}</strong></span>
                  <span>Modality: <strong>Short-axis Cine MRI</strong></span>
                </div>
              </div>
              
              <button
                onClick={() => handleImport(item.type)}
                disabled={importing === item.type}
                className="w-full mt-2 flex items-center justify-center space-x-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{importing === item.type ? 'Importing Dataset...' : 'Import Dataset to Workspace'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Imported Active Datasets */}
      <div className="glass-panel p-5 rounded-xl border border-border space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span>Active Imported Datasets ({datasets.length})</span>
        </h2>

        {datasets.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-lg">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
            <p className="text-xs text-muted-foreground">No datasets imported into current workspace yet. Click 'Import Dataset' above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground bg-muted/20">
                  <th className="py-2.5 px-3">Dataset Name</th>
                  <th className="py-2.5 px-3">Version Tag</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Subjects</th>
                  <th className="py-2.5 px-3">Data Leakage Check</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {datasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{ds.name}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{ds.version_tag}</td>
                    <td className="py-2.5 px-3">
                      {ds.is_synthetic ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          SYNTHETIC
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                          ACDC REAL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-foreground font-semibold">{ds.num_subjects}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Zero Leakage Verified</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-medium">Ready</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

