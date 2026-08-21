import React, { useEffect, useState } from 'react';
import { Sparkles, Building, Home } from 'lucide-react';

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
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onFinish) onFinish();
      if (onComplete) onComplete();
    }, 400);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleComplete();
    }, 1100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      onClick={handleComplete}
      className={`fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 select-none overflow-hidden cursor-pointer transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Subtle Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        
        {/* App Logo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center shadow-2xl shadow-indigo-600/40 border border-indigo-400/40 animate-pulse">
            <Building className="w-12 h-12 text-white stroke-[2.2]" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 p-2 rounded-full bg-emerald-500 text-slate-950 border-2 border-slate-950 shadow-lg">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* App Name & Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
            {appName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
            Smart Flat, Rent & Mess Manager
          </p>
        </div>

        {/* Developer Attribution */}
        <div className="pt-4 border-t border-white/10 w-48 flex flex-col items-center">
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-0.5">
            Crafted With Care
          </span>
          <span className="text-xs font-bold text-indigo-400">
            Developed by Sakeer Puthan
          </span>
        </div>

      </div>

      {/* Subtle Bottom Progress Dots */}
      <div className="absolute bottom-8 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/30" />
      </div>

    </div>
  );
};
