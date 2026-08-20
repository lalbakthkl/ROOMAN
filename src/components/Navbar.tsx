import React from 'react';
import { 
  Building2, 
  UserCheck, 
  ShieldAlert, 
  Sparkles, 
  Download, 
  Plus, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Database,
  LogOut,
  Camera
} from 'lucide-react';
import { Member, RoomSettings, Role } from '../types';
import { SupabaseSyncStatus } from '../lib/supabase';
import { RoomexLogo } from './RoomexLogo';

interface NavbarProps {
  settings: RoomSettings;
  members: Member[];
  activeMember: Member;
  onSelectActiveMember?: (memberId: string) => void;
  onOpenAddExpense: () => void;
  onOpenAdminModal: () => void;
  onOpenRoomSettings: () => void;
  onOpenProfilePhoto?: () => void;
  supabaseStatus: SupabaseSyncStatus;
  onManualSync: () => void;
  canInstallPWA: boolean;
  onInstallPWA: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  members,
  activeMember,
  onOpenAddExpense,
  onOpenAdminModal,
  onOpenRoomSettings,
  onOpenProfilePhoto,
  supabaseStatus,
  onManualSync,
  canInstallPWA,
  onInstallPWA,
  onSignOut,
}) => {
  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'super_admin':
        return <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">Super Admin</span>;
      case 'admin':
        return <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">Admin</span>;
      case 'co_admin':
        return <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">Co-Admin</span>;
      default:
        return <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">Member</span>;
    }
  };

  const isAdminOrSuper = activeMember.role === 'super_admin' || activeMember.role === 'admin' || activeMember.permissions.canGrantAdmin;

  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/10 safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2">
          
          {/* Logo & Room Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <RoomexLogo size="sm" />
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                  ROOMEX
                </h1>
                <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded font-mono bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold hidden xs:inline-block">
                  APP
                </span>
              </div>
              {isAdminOrSuper ? (
                <button 
                  onClick={onOpenRoomSettings}
                  className="text-[11px] sm:text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 truncate text-left transition-colors cursor-pointer"
                  title="Manage Room Settings (Super Admin / Admin)"
                >
                  <span className="truncate max-w-[110px] sm:max-w-[200px] font-medium">{settings.name}</span>
                  <span className="text-[9px] font-mono bg-white/5 px-1 py-0.2 rounded text-slate-300 border border-white/10">{settings.roomCode}</span>
                </button>
              ) : (
                <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1 truncate text-left">
                  <span className="truncate max-w-[110px] sm:max-w-[200px] font-medium">{settings.name}</span>
                  <span className="text-[9px] font-mono bg-white/5 px-1 py-0.2 rounded text-slate-300 border border-white/10">{settings.roomCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            
            {/* Supabase Status Pill */}
            <button
              onClick={onManualSync}
              title={supabaseStatus.connected ? `Supabase Connected (Click to sync) - Last synced: ${supabaseStatus.lastSyncedAt || 'Just now'}` : 'Supabase Cloud Sync (Click to retry)'}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-slate-300 hover:bg-white/5 hover:border-white/20 transition-colors min-h-[36px]"
            >
              <div className={`w-2 h-2 rounded-full ${supabaseStatus.connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400'} ${supabaseStatus.syncing ? 'animate-ping' : ''}`} />
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-medium">Monthly Status</span>
                <span className="text-[11px] font-medium text-emerald-400">
                  {supabaseStatus.syncing ? 'SYNCING...' : supabaseStatus.connected ? 'CONNECTED TO SUPABASE' : 'OFFLINE MODE'}
                </span>
              </div>
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 hover:text-white ${supabaseStatus.syncing ? 'animate-spin' : ''}`} />
            </button>

            {/* PWA Install Button */}
            {canInstallPWA && (
              <button
                onClick={onInstallPWA}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-600 min-h-[36px] cursor-pointer"
                title="Install ROOMEX App on your device"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Install</span>
              </button>
            )}

            {/* Single Authenticated User Profile Card (No member switcher dropdown) */}
            <div 
              onClick={onOpenProfilePhoto}
              className="relative flex items-center bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 rounded-xl p-1 sm:px-2 transition-all cursor-pointer group"
              title="Click to update your Profile Photo"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <img 
                    src={activeMember.avatar} 
                    alt={activeMember.name} 
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-indigo-400/50 shrink-0" 
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 rounded-full p-0.5 text-white border border-slate-900 shadow-sm opacity-80 group-hover:opacity-100">
                    <Camera className="w-2.5 h-2.5" />
                  </div>
                </div>

                <div className="flex flex-col text-left pr-1">
                  <span className="text-xs font-bold text-white max-w-[90px] sm:max-w-[140px] truncate">
                    {activeMember.name}
                  </span>
                  <span className="text-[9px] uppercase font-mono text-indigo-300 font-semibold tracking-wider">
                    {activeMember.role.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Management Button (Only for Super Admin and Admin) */}
            {isAdminOrSuper && (
              <button
                onClick={onOpenAdminModal}
                className="p-2 sm:px-3 sm:py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all min-h-[36px] min-w-[36px] justify-center bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                title="Admin & Role Delegation (Super Admin / Admin Only)"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Admin Roles</span>
              </button>
            )}

            {/* Add Expense Desktop Button */}
            <button
              onClick={onOpenAddExpense}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 min-h-[36px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>

            {/* Room Settings Gear (Only for Super Admin and Admin) */}
            {isAdminOrSuper && (
              <button
                onClick={onOpenRoomSettings}
                className="p-2 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                title="Room Settings (Super Admin & Admin Only)"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Sign Out Button */}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-2 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                title="Sign Out / Switch Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
};
