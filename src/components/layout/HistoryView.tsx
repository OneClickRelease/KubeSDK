import React from 'react';
import { motion } from 'motion/react';
import { FileText, Clock, Trash2, ArrowRight, RotateCcw, Activity, Download } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface HistoryItem {
  filename: string;
  createdAt: string;
  size: number;
}

interface HistoryViewProps {
  onRestore: (yaml: string) => void;
}

export const HistoryView = ({ onRestore }: HistoryViewProps) => {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      if (data.status === 'success') {
        setHistory(data.history);
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const handleRestoreClick = async (filename: string) => {
    try {
      const response = await fetch(`/api/history/${filename}`);
      const data = await response.json();
      if (data.status === 'success') {
        onRestore(data.yaml);
      } else {
        alert('Failed to restore: ' + data.message);
      }
    } catch (err: any) {
      alert('Error restoring: ' + err.message);
    }
  };

  const handleDeleteClick = async (filename: string) => {
    if (!confirm('Are you sure you want to permanently delete this simulation run from history?')) return;
    
    try {
      const response = await fetch(`/api/history/${filename}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.status === 'success') {
        fetchHistory(); // Refresh list
      } else {
        alert('Failed to delete: ' + data.message);
      }
    } catch (err: any) {
      alert('Error deleting: ' + err.message);
    }
  };

  const handleDownloadClick = async (filename: string) => {
    try {
      const response = await fetch(`/api/history/${filename}`);
      const data = await response.json();
      if (data.status === 'success') {
        const blob = new Blob([data.yaml], { type: 'text/yaml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download: ' + data.message);
      }
    } catch (err: any) {
      alert('Error downloading: ' + err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0D6EFD] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">Simulation History</h2>
          <p className="text-[#6C757D]">Browse and restore previous simulation configurations from local storage.</p>
        </div>
        <button 
          onClick={fetchHistory}
          className="p-2 text-[#0D6EFD] hover:bg-[#E7F1FF] rounded-lg transition-colors border border-[#DEE2E6] bg-white shadow-sm"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {history.length === 0 ? (
        <div className="p-20 bg-white rounded-3xl border border-[#E9ECEF] border-dashed text-center space-y-4">
          <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto border border-[#E9ECEF]">
            <Activity size={32} className="text-[#ADB5BD]" />
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className="text-xl font-bold">No History Found</h3>
            <p className="text-[#6C757D] text-sm mt-1">Deploy your first simulation to start building a persistent archive of your cluster configurations.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item) => (
            <div 
              key={item.filename}
              className="group bg-white rounded-3xl border border-[#E9ECEF] p-6 hover:border-[#0D6EFD] hover:shadow-xl hover:shadow-[#0D6EFD]/5 transition-all duration-300 flex flex-col gap-6"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-[#F8F9FA] rounded-2xl flex items-center justify-center text-[#0D6EFD] group-hover:bg-[#E7F1FF] transition-colors">
                  <FileText size={24} />
                </div>
                <div className="text-[10px] font-mono text-[#ADB5BD] bg-[#F8F9FA] px-2 py-1 rounded">
                  {formatSize(item.size)}
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <h4 className="font-bold text-[#1A1A1A] break-all line-clamp-2" title={item.filename}>
                  {item.filename.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_/, '').replace(/\.yaml$/, '') || 'Untitled Simulation'}
                </h4>
                <div className="flex items-center gap-2 text-[#6C757D]">
                  <Clock size={14} />
                  <span className="text-xs">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F8F9FA] flex gap-2">
                <button 
                  onClick={() => handleRestoreClick(item.filename)}
                  className="flex-1 py-2.5 bg-[#F8F9FA] text-[#0D6EFD] font-bold text-sm rounded-xl hover:bg-[#0D6EFD] hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  Restore
                </button>
                <button 
                  onClick={() => handleDownloadClick(item.filename)}
                  className="p-2.5 text-[#0D6EFD] hover:bg-[#E7F1FF] rounded-xl transition-colors border border-transparent hover:border-[#DEE2E6]"
                  title="Download YAML"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteClick(item.filename)}
                  className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Delete from history"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
