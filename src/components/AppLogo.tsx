import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  size = 'md', 
  showText = true, 
  className = '' 
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base font-bold',
    md: 'text-lg font-extrabold',
    lg: 'text-2xl font-black',
    xl: 'text-3xl font-black',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon SVG */}
      <div className={`relative ${iconSizes[size]} rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-[1.5px] shadow-lg shadow-indigo-600/25 flex items-center justify-center shrink-0`}>
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center p-1.5">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Geometric House Frame */}
            <path 
              d="M16 3L3 13.5V28C3 28.5523 3.44772 29 4 29H28C28.5523 29 29 28.5523 29 28V13.5L16 3Z" 
              stroke="url(#roomex_grad)" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            {/* Inner Exchange Split Curves */}
            <path 
              d="M11 18H21M21 18L17.5 14.5M21 18L17.5 21.5" 
              stroke="#38BDF8" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M21 22H11M11 22L14.5 25.5M11 22L14.5 18.5" 
              stroke="#34D399" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            {/* Roof Peak Dot */}
            <circle cx="16" cy="9.5" r="1.8" fill="#818CF8" />
            
            <defs>
              <linearGradient id="roomex_grad" x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="0.5" stopColor="#38BDF8" />
                <stop offset="1" stopColor="#34D399" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`${textSizes[size]} tracking-tight font-mono text-white flex items-center`}>
              ROOM<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 font-extrabold">EX</span>
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PRO
            </span>
          </div>
          {size !== 'sm' && (
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">
              MESS & EXPENSE SYNC
            </span>
          )}
        </div>
      )}
    </div>
  );
};
