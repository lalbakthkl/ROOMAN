import React, { useState } from 'react';
import { 
  Settings, 
  X, 
  Database, 
  Check, 
  Copy, 
  RefreshCw, 
  Building2, 
  DollarSign, 
  Utensils, 
  Code2, 
  Download,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { RoomSettings, Member } from '../types';
import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  SUPABASE_SQL_SCHEMA, 
  SupabaseSyncStatus 
} from '../lib/supabase';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoomSettings;
  activeMember: Member;
  supabaseStatus: SupabaseSyncStatus;
  onUpdateSettings: (newSettings: RoomSettings) => void;
  onManualSync: () => void;
  onResetData: () => void;
  canInstallPWA: boolean;
  onInstallPWA: () => void;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  activeMember,
  supabaseStatus,
  onUpdateSettings,
  onManualSync,
  onResetData,
  canInstallPWA,
  onInstallPWA,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'supabase' | 'google' | 'pwa'>('general');
  const [name, setName] = useState(settings.name);
  const [currency, setCurrency] = useState(settings.currency);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [monthlyBudget, setMonthlyBudget] = useState(settings.monthlyBudget.toString());
  const [daysInMonth, setDaysInMonth] = useState((settings.daysInMonth || 30).toString());
  const [isMessEnabled, setIsMessEnabled] = useState(settings.isMessEnabled);
  const [messMode, setMessMode] = useState(settings.messCalculationMode);
  const [messCalcType, setMessCalcType] = useState(settings.messCalculationType || 'days_stayed');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('roomex_google_client_id') || '');
  const [savedGoogleIdMsg, setSavedGoogleIdMsg] = useState(false);

  if (!isOpen) return null;

  const isSuperOrAdmin = activeMember.role === 'super_admin' || activeMember.role === 'admin';

  if (!isSuperOrAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Settings Restricted</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Only the <strong className="text-amber-400">Super Admin</strong> or <strong className="text-indigo-400">Room Admin</strong> are permitted to see or change room settings, currency, budgets, and calculation rules.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperOrAdmin) {
      return;
    }

    onUpdateSettings({
      ...settings,
      name: name.trim() || settings.name,
      currency,
      currencySymbol,
      monthlyBudget: parseFloat(monthlyBudget) || 1000,
      daysInMonth: parseInt(daysInMonth) || 30,
      isMessEnabled,
      messCalculationMode: messMode,
      messCalculationType: messCalcType,
    });

    onClose();
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Room & Supabase Settings</h2>
              <p className="text-xs text-slate-500">Configure room preferences, currency, and Supabase database sync.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'general' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            General Room Config
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'supabase' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Supabase Backend
          </button>
          <button
            onClick={() => setActiveTab('google')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'google' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-4 h-4 text-amber-400" />
            Google Sign-In & One Tap
          </button>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'pwa' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            PWA App Install
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="space-y-4">
              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Room / Flat Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Currency Symbol</label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => {
                      setCurrencySymbol(e.target.value);
                      if (e.target.value === '$') setCurrency('USD');
                      if (e.target.value === '₹') setCurrency('INR');
                      if (e.target.value === '€') setCurrency('EUR');
                      if (e.target.value === '£') setCurrency('GBP');
                      if (e.target.value === '৳') setCurrency('BDT');
                    }}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="$">$ (USD / AUD / CAD)</option>
                    <option value="₹">₹ (INR Rupee)</option>
                    <option value="€">€ (EUR Euro)</option>
                    <option value="£">£ (GBP Pound)</option>
                    <option value="৳">৳ (BDT Taka)</option>
                    <option value="AED">AED (Dirham)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Room Budget Target</label>
                  <input
                    type="number"
                    step="10"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Days In Month setting for Mess Calculation */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Days in Active Month (For Mess Bill Formula)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={daysInMonth}
                    onChange={(e) => setDaysInMonth(e.target.value)}
                    className="w-32 bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">
                    Used for: <code>(Total Purchase ÷ {daysInMonth || 30}) × Days Stayed</code>
                  </span>
                </div>
              </div>

              {/* Mess Calculation Mode */}
              <div className="p-4 bg-slate-950 border border-white/10 rounded-xl space-y-2">
                <span className="text-xs font-medium text-slate-200 block">Mess & Food Calculation Rule</span>
                
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="radio"
                    name="messCalcType"
                    value="days_stayed"
                    checked={messCalcType === 'days_stayed'}
                    onChange={() => setMessCalcType('days_stayed')}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div>
                    <strong className="text-white block">Days Stayed Formula (Default)</strong>
                    <span className="text-slate-500">(Total Food Purchase ÷ Days in Month) × Days Stayed by Roommate.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 pt-2">
                  <input
                    type="radio"
                    name="messCalcType"
                    value="meal_count"
                    checked={messCalcType === 'meal_count'}
                    onChange={() => setMessCalcType('meal_count')}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div>
                    <strong className="text-white block">Daily Meal Attendance Count</strong>
                    <span className="text-slate-500">Calculates per individual breakfast, lunch, and dinner logged plates.</span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset room to demo initial data?')) {
                      onResetData();
                      onClose();
                    }
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  Reset Demo Data
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
                >
                  Save Settings
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: SUPABASE */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    Supabase Database Connected
                  </span>
                  <button
                    onClick={onManualSync}
                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-lg hover:bg-emerald-500/30 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${supabaseStatus.syncing ? 'animate-spin' : ''}`} />
                    Sync Now
                  </button>
                </div>
                <div className="text-xs text-slate-300 space-y-1 font-mono text-[11px] pt-1">
                  <div className="truncate">
                    <span className="text-slate-500">Project URL: </span>
                    <span className="text-slate-200">{SUPABASE_URL}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-500">Anon Key: </span>
                    <span className="text-slate-200">{SUPABASE_ANON_KEY.substring(0, 20)}...</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Last Synced: </span>
                    <span className="text-slate-200">{supabaseStatus.lastSyncedAt || 'Active / Live'}</span>
                  </div>
                </div>
              </div>

              {/* SQL Schema Generator */}
              <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-indigo-400" />
                      Supabase SQL Table Schema
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Copy and run this in your Supabase SQL Editor if you want to inspect or provision cloud tables.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleCopySchema}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 text-xs font-medium transition-all"
                  >
                    {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSchema ? 'Copied SQL!' : 'Copy SQL'}</span>
                  </button>
                </div>

                <pre className="bg-slate-900 p-3 rounded-lg text-[10px] font-mono text-slate-400 max-h-48 overflow-y-auto border border-white/10">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

            </div>
          )}

          {/* TAB: GOOGLE OAUTH & ONE TAP */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Google Sign-In & Google One Tap Configuration
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ROOMEX includes instant direct Google Sign-In and Google One Tap. To connect your production Google Cloud project with official Google verification on Vercel:
                </p>

                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Google OAuth Client ID (Optional for Live Domain)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('roomex_google_client_id', googleClientId.trim());
                        setSavedGoogleIdMsg(true);
                        setTimeout(() => setSavedGoogleIdMsg(false), 2500);
                      }}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
                    >
                      {savedGoogleIdMsg ? 'Saved!' : 'Save Client ID'}
                    </button>
                  </div>
                  {savedGoogleIdMsg && (
                    <span className="text-[11px] text-emerald-400 font-medium block">
                      ✓ Google Client ID saved to local settings!
                    </span>
                  )}
                </div>
              </div>

              {/* How to setup in Google Cloud Console */}
              <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-2 text-xs">
                <span className="font-semibold text-white block">How to configure Google Cloud OAuth (For Vercel/Custom Domain):</span>
                <ol className="space-y-1.5 text-slate-400 list-decimal list-inside">
                  <li>Go to <strong className="text-slate-200">Google Cloud Console</strong> ➜ <span className="text-indigo-300">APIs & Services</span> ➜ <span className="text-indigo-300">Credentials</span>.</li>
                  <li>Click <strong className="text-slate-200">Create Credentials</strong> ➜ <strong className="text-slate-200">OAuth client ID</strong> (Type: <em>Web application</em>).</li>
                  <li>Under <strong className="text-slate-200">"Authorized JavaScript origins"</strong>, add your Vercel URL (e.g. <code>https://your-roomex-app.vercel.app</code>) and <code>http://localhost:3000</code>.</li>
                  <li>Copy your generated <strong>Client ID</strong> and paste it above or set <code>VITE_GOOGLE_CLIENT_ID</code> in Vercel Environment Variables.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: PWA */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-400" />
                  Progressive Web App (PWA) Features
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ROOMEX is fully installable on iOS, Android, and Desktop. Once installed, it works offline, syncs changes to Supabase when reconnected, and provides quick home-screen shortcuts!
                </p>

                {canInstallPWA && (
                  <button
                    onClick={onInstallPWA}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
                  >
                    Install ROOMEX App Now
                  </button>
                )}
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-2 text-xs">
                <span className="font-semibold text-white block">Installation Instructions:</span>
                <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                  <li><strong>iPhone / iPad (Safari):</strong> Tap the Share icon (square with arrow) and select <span className="text-slate-200 font-medium">"Add to Home Screen"</span>.</li>
                  <li><strong>Android (Chrome):</strong> Tap the 3 dots menu and choose <span className="text-slate-200 font-medium">"Install App"</span> or <span className="text-slate-200 font-medium">"Add to Home Screen"</span>.</li>
                  <li><strong>Desktop (Chrome/Edge):</strong> Click the install icon in the URL address bar.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="text-[11px] text-slate-500 font-mono">
            App Developed by <span className="text-slate-300 font-semibold">sakeerputhan</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
