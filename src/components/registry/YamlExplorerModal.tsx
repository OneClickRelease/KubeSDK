import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, FileCode, History, RotateCcw, Download, Copy, Check,
  Search, RefreshCw, Layers, Clock, AlertCircle, FileText, ArrowRight, Eye, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface YamlFileEntry {
  name: string;
  relPath: string;
  type: 'master' | 'capability';
  size: number;
  modifiedAt: string;
  versionsCount: number;
}

interface VersionEntry {
  version: string;
  versionNumber: number;
  timestamp: string;
  action: string;
  author: string;
  filename: string;
  size: number;
}

interface YamlExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: string;
  onVersionRestored?: () => void;
}

export const YamlExplorerModal: React.FC<YamlExplorerModalProps> = ({
  isOpen,
  onClose,
  initialFile,
  onVersionRestored
}) => {
  const [files, setFiles] = useState<YamlFileEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRelPath, setSelectedRelPath] = useState<string>(initialFile || 'capability-layers.yaml');
  
  // Active file content
  const [activeContent, setActiveContent] = useState<string>('');
  const [activeMeta, setActiveMeta] = useState<{ size: number; modifiedAt: string } | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Versions
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);
  const [versionContent, setVersionContent] = useState<string | null>(null);
  const [loadingVersionContent, setLoadingVersionContent] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState<'content' | 'diff' | 'history'>('content');
  const [copied, setCopied] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch file list
  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/registry/capabilities/files');
      const json = await res.json();
      if (json.status === 'success') {
        setFiles(json.files || []);
        if (!selectedRelPath && json.files?.length > 0) {
          setSelectedRelPath(json.files[0].relPath);
        }
      }
    } catch (e) {
      console.error('Failed to load files:', e);
    }
  }, [selectedRelPath]);

  // Fetch active file content
  const loadFileContent = useCallback(async (relPath: string) => {
    if (!relPath) return;
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/registry/capabilities/file?path=${encodeURIComponent(relPath)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setActiveContent(json.content || '');
        setActiveMeta({ size: json.size, modifiedAt: json.modifiedAt });
      }
    } catch (e) {
      console.error('Failed to load file content:', e);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  // Fetch version history
  const loadVersions = useCallback(async (relPath: string) => {
    if (!relPath) return;
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/registry/capabilities/versions?file=${encodeURIComponent(relPath)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setVersions(json.versions || []);
      }
    } catch (e) {
      console.error('Failed to load versions:', e);
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  // Fetch historical version content
  const loadVersionSnapshot = useCallback(async (relPath: string, versionId: string) => {
    setLoadingVersionContent(true);
    try {
      const res = await fetch(`/api/registry/capabilities/version-content?file=${encodeURIComponent(relPath)}&versionId=${encodeURIComponent(versionId)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setVersionContent(json.content || '');
      }
    } catch (e) {
      console.error('Failed to load snapshot:', e);
    } finally {
      setLoadingVersionContent(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
      if (initialFile) {
        setSelectedRelPath(initialFile);
      }
    }
  }, [isOpen, initialFile, loadFiles]);

  useEffect(() => {
    if (isOpen && selectedRelPath) {
      loadFileContent(selectedRelPath);
      loadVersions(selectedRelPath);
      setSelectedVersion(null);
      setVersionContent(null);
      setStatusMessage(null);
    }
  }, [isOpen, selectedRelPath, loadFileContent, loadVersions]);

  if (!isOpen) return null;

  const handleSelectVersion = (v: VersionEntry) => {
    setSelectedVersion(v);
    loadVersionSnapshot(selectedRelPath, v.version);
    setViewMode('diff');
  };

  const handleCopy = () => {
    const textToCopy = viewMode === 'diff' && versionContent ? versionContent : activeContent;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.location.href = `/api/registry/capabilities/export?file=${encodeURIComponent(selectedRelPath)}`;
  };

  const handleRestore = async (versionId: string) => {
    if (!window.confirm(`Are you sure you want to rollback ${selectedRelPath} to ${versionId}? A backup snapshot of the current state will be created automatically.`)) {
      return;
    }

    setRestoring(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/registry/capabilities/restore-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: selectedRelPath, versionId })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setStatusMessage({ type: 'success', text: `Successfully rolled back to version ${versionId}` });
        loadFileContent(selectedRelPath);
        loadVersions(selectedRelPath);
        setViewMode('content');
        setSelectedVersion(null);
        if (onVersionRestored) onVersionRestored();
      } else {
        setStatusMessage({ type: 'error', text: json.message || 'Rollback failed' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Restore request failed' });
    } finally {
      setRestoring(false);
    }
  };

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.relPath.toLowerCase().includes(search.toLowerCase())
  );

  // Compute a simple line-by-line diff
  const computeDiffLines = (curr: string, prev: string) => {
    const currLines = curr.split('\n');
    const prevLines = prev.split('\n');
    const max = Math.max(currLines.length, prevLines.length);
    const result: Array<{ type: 'same' | 'added' | 'removed' | 'modified'; currLine?: string; prevLine?: string; index: number }> = [];

    for (let i = 0; i < max; i++) {
      const c = currLines[i];
      const p = prevLines[i];
      if (c === p) {
        result.push({ type: 'same', currLine: c, prevLine: p, index: i + 1 });
      } else if (c !== undefined && p === undefined) {
        result.push({ type: 'added', currLine: c, prevLine: '', index: i + 1 });
      } else if (c === undefined && p !== undefined) {
        result.push({ type: 'removed', currLine: '', prevLine: p, index: i + 1 });
      } else {
        result.push({ type: 'modified', currLine: c, prevLine: p, index: i + 1 });
      }
    }
    return result;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl border border-[#E9ECEF] w-full max-w-6xl h-[88vh] overflow-hidden flex flex-col"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#E9ECEF] bg-[#F8F9FA] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
              <FileCode size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1A1A1A]">Capability YAML Explorer & Versions</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wider">
                  Auto-Versioning Active
                </span>
              </div>
              <p className="text-xs text-[#6C757D]">
                Inspect active capability YAML definitions, explore immutable snapshot history, and roll back changes.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: File Tree */}
          <div className="w-64 border-r border-[#E9ECEF] bg-[#FDFDFE] flex flex-col shrink-0">
            {/* Search */}
            <div className="p-3 border-b border-[#E9ECEF]">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:border-[#0D6EFD]"
                />
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-[#ADB5BD] tracking-wider">
                Root & Capabilities ({filteredFiles.length})
              </div>
              {filteredFiles.map(file => {
                const isSelected = file.relPath === selectedRelPath;
                return (
                  <button
                    key={file.relPath}
                    onClick={() => {
                      setSelectedRelPath(file.relPath);
                      setViewMode('content');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all',
                      isSelected
                        ? 'bg-[#E7F1FF] text-[#0D6EFD] font-bold border border-[#B6D4FE]'
                        : 'text-[#495057] hover:bg-gray-100/70 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {file.type === 'master' ? (
                        <Layers size={14} className={isSelected ? 'text-[#0D6EFD]' : 'text-purple-500'} />
                      ) : (
                        <FileText size={14} className={isSelected ? 'text-[#0D6EFD]' : 'text-[#6C757D]'} />
                      )}
                      <span className="truncate">{file.name}</span>
                    </div>
                    {file.versionsCount > 1 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white border border-[#E9ECEF] text-[#6C757D] font-mono shrink-0 ml-1">
                        {file.versionsCount}v
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center / Right: Viewer & Version Inspector */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Action Bar */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#E9ECEF] bg-[#FAFAFA]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="font-mono text-xs font-bold text-[#1A1A1A] flex items-center gap-2 truncate">
                  <span className="text-[#6C757D] font-normal">File:</span>
                  <span className="bg-gray-200/70 px-2 py-0.5 rounded text-gray-800">{selectedRelPath}</span>
                </div>
                {activeMeta && (
                  <span className="text-[11px] text-[#ADB5BD] hidden md:inline">
                    {(activeMeta.size / 1024).toFixed(1)} KB · Modified {new Date(activeMeta.modifiedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* View mode toggle & Action buttons */}
              <div className="flex items-center gap-2">
                <div className="flex bg-[#E9ECEF] p-0.5 rounded-lg">
                  <button
                    onClick={() => setViewMode('content')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                      viewMode === 'content' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6C757D] hover:text-[#1A1A1A]'
                    )}
                  >
                    Active YAML
                  </button>
                  <button
                    onClick={() => setViewMode('history')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5',
                      viewMode === 'history' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6C757D] hover:text-[#1A1A1A]'
                    )}
                  >
                    <History size={12} />
                    <span>Versions ({versions.length})</span>
                  </button>
                  {selectedVersion && (
                    <button
                      onClick={() => setViewMode('diff')}
                      className={cn(
                        'px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 text-purple-700',
                        viewMode === 'diff' ? 'bg-white shadow-sm font-bold' : 'hover:text-purple-900'
                      )}
                    >
                      <span>Diff vs {selectedVersion.version}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#495057] bg-white border border-[#E9ECEF] rounded-lg hover:border-[#DEE2E6] transition-colors"
                  title="Copy YAML content"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#495057] bg-white border border-[#E9ECEF] rounded-lg hover:border-[#DEE2E6] transition-colors"
                  title="Download this YAML file"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Status notification banner if any */}
            {statusMessage && (
              <div className={cn(
                'px-5 py-2 text-xs flex items-center justify-between border-b',
                statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
              )}>
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{statusMessage.text}</span>
                </div>
                <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Viewer Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main code / diff display */}
              <div className="flex-1 overflow-auto bg-[#1E1E1E] text-gray-200 font-mono text-xs p-4">
                {loadingContent ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <RefreshCw size={20} className="animate-spin mr-2" />
                    <span>Loading YAML content…</span>
                  </div>
                ) : viewMode === 'diff' && selectedVersion && versionContent !== null ? (
                  <div className="space-y-0.5">
                    <div className="bg-[#2D2D2D] p-3 rounded-lg border border-gray-700 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-sans text-xs">Comparing</span>
                        <span className="text-emerald-400 font-bold">Active Live Version</span>
                        <span className="text-gray-400 font-sans text-xs">vs</span>
                        <span className="text-purple-400 font-bold">{selectedVersion.version} snapshot ({new Date(selectedVersion.timestamp).toLocaleString()})</span>
                      </div>
                      <button
                        onClick={() => handleRestore(selectedVersion.version)}
                        disabled={restoring}
                        className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-sans text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        {restoring ? 'Rolling back…' : `Rollback to ${selectedVersion.version}`}
                      </button>
                    </div>

                    {/* Diff lines */}
                    {computeDiffLines(activeContent, versionContent).map((diff, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-start px-2 py-0.5 rounded leading-5',
                          diff.type === 'added' ? 'bg-emerald-950/60 text-emerald-300' :
                          diff.type === 'removed' ? 'bg-rose-950/60 text-rose-300 line-through opacity-75' :
                          diff.type === 'modified' ? 'bg-amber-950/40 text-amber-200' : 'text-gray-300'
                        )}
                      >
                        <span className="w-8 select-none text-gray-600 text-[10px] text-right mr-3 shrink-0">
                          {diff.index}
                        </span>
                        <span className="w-4 select-none font-bold shrink-0">
                          {diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : diff.type === 'modified' ? '~' : ' '}
                        </span>
                        <pre className="whitespace-pre-wrap break-all flex-1 font-mono">{diff.currLine || diff.prevLine}</pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Standard Active YAML View */
                  <div className="space-y-0.5">
                    {activeContent.split('\n').map((line, idx) => (
                      <div key={idx} className="flex items-start leading-5 hover:bg-white/5 px-2 rounded">
                        <span className="w-8 select-none text-gray-600 text-[10px] text-right mr-3 shrink-0">
                          {idx + 1}
                        </span>
                        <pre className="whitespace-pre-wrap break-all flex-1 font-mono text-emerald-300/90">{line}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Version History Drawer / Sidebar */}
              <div className="w-80 border-l border-[#E9ECEF] bg-[#FBFBFC] flex flex-col shrink-0">
                <div className="p-4 border-b border-[#E9ECEF] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-purple-600" />
                    <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Version History</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                    {versions.length} Snapshots
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {loadingVersions ? (
                    <div className="p-8 text-center text-xs text-[#6C757D]">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-[#0D6EFD]" />
                      Loading history…
                    </div>
                  ) : versions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#6C757D]">
                      <History size={24} className="mx-auto mb-2 opacity-30" />
                      No historical snapshots recorded yet.
                    </div>
                  ) : (
                    versions.map((v, i) => {
                      const isLatest = i === 0;
                      const isComparing = selectedVersion?.version === v.version;
                      return (
                        <div
                          key={v.version + v.timestamp}
                          className={cn(
                            'p-3 rounded-xl border transition-all',
                            isComparing
                              ? 'bg-purple-50 border-purple-300 shadow-sm'
                              : 'bg-white border-[#E9ECEF] hover:border-[#CED4DA]'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-[#1A1A1A] bg-[#F1F3F5] px-1.5 py-0.5 rounded">
                                {v.version}
                              </span>
                              {isLatest && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  Live
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#ADB5BD] flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(v.timestamp).toLocaleDateString()} {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-[#495057] mb-2 leading-tight">{v.action}</p>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px]">
                            <span className="text-[#ADB5BD] font-medium">By {v.author || 'User'}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSelectVersion(v)}
                                className="px-2 py-1 bg-[#F8F9FA] hover:bg-purple-100 text-purple-700 font-bold rounded transition-colors flex items-center gap-1"
                              >
                                <Eye size={10} /> Diff
                              </button>
                              {!isLatest && (
                                <button
                                  onClick={() => handleRestore(v.version)}
                                  disabled={restoring}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded transition-colors flex items-center gap-1"
                                >
                                  <RotateCcw size={10} /> Rollback
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
