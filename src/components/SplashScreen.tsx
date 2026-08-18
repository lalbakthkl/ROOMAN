import React, { useEffect, useState } from 'react';
import { Sparkles, ShieldCheck, Home, Utensils, Zap, Users, ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  onComplete?: () => void;
  appName?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  onComplete, 
  appName = 'ROOMEX' 
}) => {
  const [progress, setProgress] = useState(25);
  const [phase, setPhase] = useState(0);

  const handleFinish = () => {
    if (onFinish) onFinish();
    if (onComplete) onComplete();
  };

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(60);
      setPhase(1);
    }, 300);

    const timer2 = setTimeout(() => {
      setProgress(90);
      setPhase(2);
    }, 650);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setPhase(3);
    }, 950);

    const timer4 = setTimeout(() => {
      handleFinish();
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div 
      onClick={handleFinish}
      className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between p-6 text-slate-100 select-none overflow-hidden cursor-pointer"
    >
      
      {/* Background Subtle Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      
      {/* Top Spacer */}
      <div className="w-full flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          className="text-[11px] font-mono uppercase tracking-wider text-slate-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 transition-all"
        >
          <span>Skip</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-400">
        
        {/* App Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center shadow-2xl shadow-indigo-600/40 border border-indigo-400/40 animate-pulse">
            <Home className="w-10 h-10 text-white stroke-[2.2]" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-slate-950 border-2 border-slate-950 shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* App Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {appName}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PRO
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Room Expense & Mess Management
          </p>
        </div>

        {/* Creator Highlight Card */}
        <div className="w-full bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-2">
          <div className="text-[10px] uppercase tracking-[0.25em] text-indigo-400 font-semibold flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Release</span>
          </div>

          <div className="text-sm font-semibold text-white tracking-wide">
            App Developed by <span className="text-indigo-400 font-bold underline decoration-indigo-500/50 underline-offset-4">sakeerputhan</span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-2 pt-1 font-mono">
            <span className="inline-flex items-center gap-1">
              <Utensils className="w-3 h-3 text-orange-400" /> Mess Pool
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Equal Splits
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" /> Room Sync
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden border border-white/10">
            <div 
              className="bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>
              {phase === 0 && 'Loading room workspace...'}
              {phase === 1 && 'Applying mess bill formulas...'}
              {phase === 2 && 'Syncing roommate balances...'}
              {phase >= 3 && 'Opening Dashboard...'}
            </span>
            <span className="text-indigo-300 font-bold">{progress}%</span>
          </div>
        </div>

        {/* Direct Open Tap */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span>Open Dashboard Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>

      {/* Footer Branding */}
      <div className="text-center text-[10px] text-slate-500 font-mono">
        Crafted by sakeerputhan © {new Date().getFullYear()}
      </div>

    </div>
  );
};
