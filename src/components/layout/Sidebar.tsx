import React from 'react';
import { 
  Home, 
  Settings, 
  Layers, 
  Activity, 
  Terminal, 
  XCircle, 
  Zap,
  Library,
  BookOpen,
  AppWindow
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: any) => void;
  onResetSession: () => void;
}

const NavButton = ({ 
  active, 
  onClick, 
  icon, 
  label,
  disabled = false,
  indent = false
}: { 
  active?: boolean; 
  onClick?: () => void; 
  icon: React.ReactNode; 
  label: string;
  disabled?: boolean;
  indent?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium',
      indent && 'pl-8',
      active ? 'bg-[#E7F1FF] text-[#0D6EFD]' : 'text-[#6C757D] hover:bg-[#F8F9FA]',
      disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
    )}
  >
    {icon} {label}
  </button>
);

export const Sidebar = ({ activeMenu, setActiveMenu, onResetSession }: SidebarProps) => {
  return (
    <aside className="w-72 bg-white border-r border-[#E9ECEF] flex flex-col sticky top-0 h-screen">
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#0D6EFD] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#0D6EFD]/20">
            <Zap size={24} />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-[#1A1A1A]">KubeSDK Simulator</h1>
        </div>

        <nav className="space-y-1">
          <NavButton
            active={activeMenu === 'home'}
            onClick={() => setActiveMenu('home')}
            icon={<Home size={18} />}
            label="Home"
          />
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">Platform Engineering</p>
          </div>
          
          <NavButton
            active={activeMenu === 'define'}
            onClick={() => setActiveMenu('define')}
            icon={<Settings size={18} />}
            label="Define Local Run"
          />

          <NavButton
            active={activeMenu === 'create-application'}
            onClick={() => setActiveMenu('create-application')}
            icon={<AppWindow size={18} />}
            label="Create Application"
          />

          {/* Registry group */}
          <NavButton
            active={activeMenu === 'registry'}
            onClick={() => setActiveMenu('registry')}
            icon={<Library size={18} />}
            label="Capability Registry"
          />

          {/* Capability Catalog — indented child of Registry */}
          <NavButton
            active={activeMenu === 'catalog'}
            onClick={() => setActiveMenu('catalog')}
            icon={<BookOpen size={16} />}
            label="Capability Catalog"
            indent
          />

          <NavButton
            disabled
            icon={<Activity size={18} />}
            label="Runtime Profiles"
          />

          <div className="pt-4 pb-2">
            <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">History</p>
          </div>
          
          <NavButton
            active={activeMenu === 'history'}
            onClick={() => setActiveMenu('history')}
            icon={<Activity size={18} />}
            label="Run History"
          />

          <div className="pt-4 pb-2">
            <p className="px-4 text-[11px] font-bold text-[#ADB5BD] uppercase tracking-wider">System</p>
          </div>
          
          <NavButton
            active={activeMenu === 'settings'}
            onClick={() => setActiveMenu('settings')}
            icon={<Settings size={18} />}
            label="Global Settings"
          />
        </nav>
      </div>

      <div className="p-6 border-t border-[#E9ECEF] space-y-3">
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
