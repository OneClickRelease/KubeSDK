import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Download, Upload, FileText, CheckCircle2, AlertTriangle,
  Archive, FileCode, ArrowRight, RefreshCw, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableFiles?: Array<{ name: string; relPath: string }>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableFiles = []
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Import state
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pasteContent, setPasteContent] = useState('');
  const [targetFilename, setTargetFilename] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportZip = () => {
    window.location.href = '/api/registry/capabilities/export';
  };

  const handleExportSingle = (relPath: string) => {
    window.location.href = `/api/registry/capabilities/export?file=${encodeURIComponent(relPath)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setTargetFilename(file.name);
      setImportError(null);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);
    setUploading(true);

    try {
      let res: Response;

      if (importMode === 'file') {
        if (!selectedFile) {
          setImportError('Please select a YAML file to import');
          setUploading(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        res = await fetch('/api/registry/capabilities/import', {
          method: 'POST',
          body: formData
        });
      } else {
        if (!pasteContent.trim()) {
          setImportError('Please paste valid YAML content');
          setUploading(false);
          return;
        }
        if (!targetFilename.trim()) {
          setImportError('Please enter a target filename (e.g. sql.yaml)');
          setUploading(false);
          return;
        }
        res = await fetch('/api/registry/capabilities/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: pasteContent,
            filename: targetFilename.endsWith('.yaml') || targetFilename.endsWith('.yml') ? targetFilename : `${targetFilename}.yaml`
          })
        });
      }

      const json = await res.json();
      if (json.status === 'success') {
        setImportSuccess(json.message || 'Import successful!');
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setImportError(json.message || 'Import failed');
      }
    } catch (err: any) {
      setImportError(err.message || 'Network request failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl border border-[#E9ECEF] w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9ECEF] bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D6EFD] flex items-center justify-center">
              {activeTab === 'export' ? <Download size={20} /> : <Upload size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">
                {activeTab === 'export' ? 'Export Capability Catalog' : 'Import Capability Definitions'}
              </h2>
              <p className="text-xs text-[#6C757D]">
                Transfer capability configurations with automatic version snapshotting.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E9ECEF] px-6 bg-white">
          <button
            onClick={() => setActiveTab('export')}
            className={cn(
              'py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2',
              activeTab === 'export' ? 'border-[#0D6EFD] text-[#0D6EFD]' : 'border-transparent text-[#6C757D] hover:text-[#1A1A1A]'
            )}
          >
            <Download size={14} /> Export Options
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={cn(
              'py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2',
              activeTab === 'import' ? 'border-[#0D6EFD] text-[#0D6EFD]' : 'border-transparent text-[#6C757D] hover:text-[#1A1A1A]'
            )}
          >
            <Upload size={14} /> Import YAML
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              {/* Full ZIP Bundle Card */}
              <div className="p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Archive size={18} className="text-[#0D6EFD]" />
                    <h3 className="text-sm font-bold text-[#1A1A1A]">Full Catalog Package (.zip)</h3>
                  </div>
                  <p className="text-xs text-[#6C757D] max-w-sm">
                    Downloads the master <code className="font-mono text-gray-800 font-semibold">capability-layers.yaml</code> and all individual capability definitions.
                  </p>
                </div>
                <button
                  onClick={handleExportZip}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#0D6EFD] hover:bg-[#0B5ED7] rounded-xl shadow-md shadow-[#0D6EFD]/20 transition-all shrink-0"
                >
                  <Download size={14} /> Export ZIP
                </button>
              </div>

              {/* Single File Downloads */}
              <div>
                <p className="text-xs font-bold text-[#495057] uppercase tracking-wider mb-2">
                  Individual Capability YAML Files
                </p>
                <div className="max-h-48 overflow-y-auto border border-[#E9ECEF] rounded-xl divide-y divide-[#E9ECEF] bg-[#FDFDFE]">
                  <div className="flex items-center justify-between p-3 bg-[#F8F9FA]">
                    <div className="flex items-center gap-2">
                      <FileCode size={14} className="text-purple-600" />
                      <span className="text-xs font-bold text-[#1A1A1A]">capability-layers.yaml (Master Hierarchy)</span>
                    </div>
                    <button
                      onClick={() => handleExportSingle('capability-layers.yaml')}
                      className="text-xs font-bold text-[#0D6EFD] hover:underline flex items-center gap-1"
                    >
                      <Download size={12} /> Download
                    </button>
                  </div>
                  {availableFiles.filter(f => f.name !== 'capability-layers.yaml').map(f => (
                    <div key={f.relPath} className="flex items-center justify-between p-2.5 hover:bg-white transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[#ADB5BD]" />
                        <span className="text-xs text-[#495057] font-medium">{f.name}</span>
                      </div>
                      <button
                        onClick={() => handleExportSingle(f.relPath)}
                        className="text-xs font-semibold text-[#6C757D] hover:text-[#0D6EFD] flex items-center gap-1"
                      >
                        <Download size={12} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Import Tab */
            <form onSubmit={handleImportSubmit} className="space-y-4">
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
              {importSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {/* Mode switch */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('file')}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold rounded-lg border transition-all',
                    importMode === 'file' ? 'bg-[#E7F1FF] text-[#0D6EFD] border-[#B6D4FE]' : 'bg-white text-[#6C757D] border-[#E9ECEF]'
                  )}
                >
                  Upload File (.yaml)
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('paste')}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold rounded-lg border transition-all',
                    importMode === 'paste' ? 'bg-[#E7F1FF] text-[#0D6EFD] border-[#B6D4FE]' : 'bg-white text-[#6C757D] border-[#E9ECEF]'
                  )}
                >
                  Paste YAML Text
                </button>
              </div>

              {importMode === 'file' ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".yaml,.yml"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#DEE2E6] hover:border-[#0D6EFD] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#FBFBFC]"
                  >
                    <Upload size={32} className="mx-auto mb-2 text-[#ADB5BD]" />
                    <p className="text-xs font-bold text-[#1A1A1A]">
                      {selectedFile ? selectedFile.name : 'Click to browse YAML file'}
                    </p>
                    <p className="text-[11px] text-[#ADB5BD] mt-1">Supports capability-layers.yaml or any capability YAML</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1">
                      Target Filename *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. sql.yaml, messaging.yaml, custom-tool.yaml"
                      value={targetFilename}
                      onChange={e => setTargetFilename(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:border-[#0D6EFD]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#495057] uppercase tracking-wider mb-1">
                      YAML Content *
                    </label>
                    <textarea
                      rows={6}
                      placeholder="sql:&#10;  providers:&#10;    - name: PostgreSQL&#10;..."
                      value={pasteContent}
                      onChange={e => setPasteContent(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#1E1E1E] text-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D6EFD]"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                <Sparkles size={14} className="text-[#0D6EFD] shrink-0 mt-0.5" />
                <span>An automated immutable version snapshot will be created before saving this file, allowing one-click rollbacks anytime.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E9ECEF]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#6C757D] hover:bg-[#F8F9FA] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0D6EFD] hover:bg-[#0B5ED7] rounded-lg shadow-md shadow-[#0D6EFD]/20 transition-all disabled:opacity-50"
                >
                  {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'Importing…' : 'Import & Apply'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
