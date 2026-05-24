import React from 'react';
import { 
  Home, 
  Settings, 
  Layers, 
  Activity, 
  Terminal, 
  XCircle, 
  Zap,
  Library
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: any) => void;
  onResetSession: () => void;
}

export const Sidebar = ({ activeMenu, setActiveMenu, onResetSession }: SidebarProps) => {
  return (
    <aside className="w-72 bg-white border-r border-[#E9ECEF] flex flex-col sticky top-0 h-screen">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#0D6EFD] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#0D6EFD]/20">
            <Zap size={24} />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-[#1A1A1A]">KubeSDK Simulator</h1>
        </div>

        <nav className="space-y-1">
          <button 
            onClick={() => setActiveMenu('home')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
              activeMenu === 'home' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
            )}
          >
            <Home size={18} /> Home
          </button>
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Platform Engineering</p>
          </div>
          
          <button 
            onClick={() => setActiveMenu('define')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
              activeMenu === 'define' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
            )}
          >
            <Settings size={18} /> Define Local Run
          </button>
          
          <button 
            onClick={() => setActiveMenu('registry')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
              activeMenu === 'registry' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
            )}
          >
            <Library size={18} /> Capability Registry
          </button>
          
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#6C757D] opacity-50 cursor-not-allowed text-sm font-medium">
            <Activity size={18} /> Runtime Profiles
          </button>

          <div className="pt-4 pb-2">
            <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">History</p>
          </div>
          
          <button 
            onClick={() => setActiveMenu('history')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
              activeMenu === 'history' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
            )}
          >
            <Activity size={18} /> Run History
          </button>

          <div className="pt-4 pb-2">
            <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">System</p>
          </div>
          
          <button 
            onClick={() => setActiveMenu('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
              activeMenu === 'settings' ? "bg-[#E7F1FF] text-[#0D6EFD]" : "text-[#6C757D] hover:bg-[#F8F9FA]"
            )}
          >
            <Settings size={18} /> Global Settings
          </button>
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-[#E9ECEF] space-y-3">
        <div className="flex items-center gap-3 text-[#6C757D] text-xs">
          <Terminal size={14} />
          <span>v2.0.0-alpha</span>
          <span className="ml-auto text-[10px] text-emerald-600 font-bold">● Auto-saved</span>
        </div>
        <button
          onClick={onResetSession}
          className="w-full text-xs text-[#ADB5BD] hover:text-red-500 transition-colors py-1.5 px-3 rounded-lg border border-transparent hover:border-red-100 hover:bg-red-50 flex items-center gap-2"
        >
          <XCircle size={12} /> Reset Session
        </button>
      </div>
    </aside>
  );
};
