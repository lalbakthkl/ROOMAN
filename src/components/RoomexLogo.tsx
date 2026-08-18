import React, { useState } from 'react';
import logoImage from '../assets/images/roomex_modern_logo_1786997243220.jpg';

interface RoomexLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const RoomexLogo: React.FC<RoomexLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-9 h-9 min-w-[36px] min-h-[36px] text-base rounded-xl',
    md: 'w-11 h-11 min-w-[44px] min-h-[44px] text-lg rounded-xl',
    lg: 'w-14 h-14 min-w-[56px] min-h-[56px] text-2xl rounded-2xl',
    xl: 'w-20 h-20 min-w-[80px] min-h-[80px] text-3xl rounded-3xl',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div 
        className={`relative flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-600/30 border border-indigo-500/40 bg-slate-900 group ${sizeClasses[size]}`}
      >
        {!imageError ? (
          <img
            src={logoImage}
            alt="ROOMEX"
            className="w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          /* High-resolution glowing vector fallback */
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex items-center justify-center p-1.5 text-white font-black">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              {/* Modern isometric R fused with architectural roof */}
              <path
                d="M 22 80 L 22 24 L 54 24 C 68 24, 78 32, 78 44 C 78 54, 70 61, 58 63 L 78 80 L 62 80 L 45 64 L 38 64 L 38 80 Z M 38 38 L 38 52 L 53 52 C 60 52, 64 48, 64 45 C 64 41, 60 38, 53 38 Z"
                fill="url(#logo-grad)"
              />
              <circle cx="75" cy="22" r="7" fill="#34d399" />
            </svg>
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-tight text-white text-base sm:text-lg">
              ROOMEX
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-mono">
              APP
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Smart Room & Mess Manager
          </span>
        </div>
      )}
    </div>
  );
};
