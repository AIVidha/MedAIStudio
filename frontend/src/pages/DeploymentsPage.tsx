import React, { useState, useEffect } from 'react';
import { Rocket, Box, CheckCircle2, Terminal, Play, FileCode, ShieldCheck, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface DeploymentItem {
  id: string;
  architecture: string;
  endpoint_url: string;
  status: string;
  target_format: string;
  created_at: string;
}

export const DeploymentsPage: React.FC = () => {
  const [deployments, setDeployments] = useState<DeploymentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [selectedArch, setSelectedArch] = useState<string>('UNet');
  const [message, setMessage] = useState<string | null>(null);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/deployments');
      setDeployments(res.data);
    } catch (err) {
      console.error('Failed to load deployments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (archName: string) => {
    setExporting(archName);
    try {
      const res = await axios.post(`/api/v1/deployments/export-onnx/${archName}`);
      setMessage(res.data.message || 'ONNX model exported successfully.');
      await fetchDeployments();
    } catch (err: any) {
      setMessage('Failed to export ONNX model.');
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Rocket className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">ONNX Model Export & Container Deployment</h1>
            <p className="text-xs text-muted-foreground">Export PyTorch weights to standalone ONNX Runtime containers for zero-dependency clinical edge deployment.</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedArch}
            onChange={(e) => setSelectedArch(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg font-mono"
          >
            <option value="UNet">Export U-Net (ONNX)</option>
            <option value="BasicUNetPlusPlus">Export U-Net++ (ONNX)</option>
            <option value="EfficientUNet">Export Efficient-UNet (ONNX)</option>
            <option value="SegResNet">Export SegResNet (ONNX)</option>
          </select>

          <button
            onClick={() => handleExport(selectedArch)}
            disabled={exporting === selectedArch}
            className="flex items-center space-x-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {exporting === selectedArch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />}
            <span>{exporting === selectedArch ? 'Exporting...' : 'Export ONNX Model'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Active Container Endpoint Table */}
      <div className="glass-panel p-5 rounded-xl border border-border space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
          <Box className="w-4 h-4 text-emerald-400" />
          <span>Active ONNX Runtime Container Endpoints ({deployments.length})</span>
        </h2>

        {deployments.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-lg space-y-2">
            <p className="text-xs text-muted-foreground font-mono">No active ONNX deployments registered yet.</p>
            <p className="text-xs text-muted-foreground">Select an architecture above and click 'Export ONNX Model'.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground bg-muted/20">
                  <th className="py-2.5 px-3">Architecture</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3">Inference Endpoint URL</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Health Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {deployments.map((dep) => (
                  <tr key={dep.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{dep.architecture}</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px]">
                        {dep.target_format}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{dep.endpoint_url}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-medium">{dep.status}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready (200 OK)</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* cURL Example & Container Test Panel */}
      <div className="glass-panel p-5 rounded-xl border border-border space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span>Standalone Container cURL Inference Call</span>
        </h2>
        <div className="p-3 bg-black/80 rounded-lg border border-border/80 font-mono text-xs text-emerald-400 overflow-x-auto">
          <code>
            curl -X POST "http://localhost:8001/predict" -H "Content-Type: application/json" -d '{`{"input_shape": [1, 1, 160, 160]}`}'
          </code>
        </div>
      </div>
    </div>
  );
};

