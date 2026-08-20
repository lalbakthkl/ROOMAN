import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  X, 
  Check, 
  Sparkles, 
  User, 
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { Member } from '../types';

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAvatar: (avatarUrl: string) => void;
  member?: Member | null;
  memberName?: string;
  currentAvatar?: string;
  role?: string;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=6366f1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aiden&backgroundColor=f59e0b',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Bella&backgroundColor=10b981',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&backgroundColor=3b82f6',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&backgroundColor=ec4899',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=8b5cf6',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper&backgroundColor=06b6d4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=14b8a6',
];

export const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  isOpen,
  onClose,
  onSaveAvatar,
  member,
  memberName,
  currentAvatar,
  role,
}) => {
  const initialAvatar = currentAvatar || member?.avatar || PRESET_AVATARS[0];
  const [selectedAvatar, setSelectedAvatar] = useState<string>(initialAvatar);
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'url'>('upload');
  const [customUrl, setCustomUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with prop when opened or member changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(currentAvatar || member?.avatar || PRESET_AVATARS[0]);
      setErrorMsg(null);
    }
  }, [isOpen, currentAvatar, member]);

  if (!isOpen) return null;

  const displayName = memberName || member?.name || 'User';
  const displayRole = role || member?.role?.replace('_', ' ') || 'Member';

  // Process File Upload and convert to compressed Base64 Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 10MB limit.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image using HTML5 Canvas to max 300x300 for crispness and compact storage
        const canvas = document.createElement('canvas');
        const MAX_DIM = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedAvatar(compressedDataUrl);
        } else {
          setSelectedAvatar(event.target?.result as string);
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setErrorMsg('Failed to process image file.');
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    setSelectedAvatar(customUrl.trim());
    setCustomUrl('');
  };

  const handleSave = () => {
    onSaveAvatar(selectedAvatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Profile Photo</h3>
              <p className="text-xs text-slate-400">
                Updating photo for <strong className="text-slate-200">{displayName}</strong> ({displayRole})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          
          {/* Avatar Preview */}
          <div className="flex flex-col items-center justify-center gap-3 py-2">
            <div className="relative group">
              <img 
                src={selectedAvatar} 
                alt={displayName} 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 bg-slate-950"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Upload</span>
              </button>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Photo Preview
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-white/5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Image URL</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Tab 1: Upload from Device */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-white/20 hover:border-indigo-500 rounded-2xl bg-slate-950/60 hover:bg-slate-950 text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                  {isProcessing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Click to browse or take photo
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Supports JPG, PNG, WEBP from your phone or PC
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Curated Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-semibold block">
                Choose an avatar style:
              </span>
              <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {PRESET_AVATARS.map((url, idx) => {
                  const isSelected = selectedAvatar === url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-95 shadow-md' 
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={url} 
                        alt={`Preset ${idx + 1}`} 
                        className="w-full h-full object-cover bg-slate-950" 
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center text-white">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Direct URL */}
          {activeTab === 'url' && (
            <form onSubmit={handleApplyCustomUrl} className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">
                Paste Image Web Link:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Preview
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/80 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Photo</span>
          </button>
        </div>

      </div>
    </div>
  );
};
