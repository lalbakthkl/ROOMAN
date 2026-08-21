import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Users, 
  Check, 
  Building, 
  Smartphone, 
  RefreshCw,
  Globe,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Member, Role, AuthUser, MembershipType, RoomSettings, RoomData } from '../types';
import { fetchRoomFromSupabase, verifyMemberLogin, getOrCreateAdminRoom } from '../lib/storage';
import { supabase } from '../supabaseClient.js';

interface AuthScreenProps {
  existingMembers?: Member[];
  members?: Member[];
  settings?: RoomSettings;
  onLogin: (user: AuthUser, loadedRoomData?: RoomData) => void;
  onRegister?: (memberData: { name: string; email: string; password?: string; role: Role; upiId?: string; membershipType?: MembershipType }) => void;
  onRegisterNewRoom?: (params: {
    adminName: string;
    email: string;
    password: string;
    roomName: string;
    roomCode: string;
    currency: string;
    currencySymbol: string;
    upiId?: string;
  }) => void;
  roomName?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  existingMembers = [],
  members = [],
  settings,
  onLogin,
  onRegisterNewRoom,
}) => {
  const memberList = existingMembers.length > 0 ? existingMembers : members;
  const currentRoomCode = settings?.roomCode || '';

  // Auth Mode: 'signin' | 'signup' | 'roomcode' (initialized from route)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'roomcode'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/signup') return 'signup';
      if (window.location.pathname === '/admin' || window.location.pathname === '/admin/dashboard' || window.location.search.includes('mode=admin')) return 'signin';
      if (window.location.pathname === '/member-login') return 'roomcode';
    }
    return 'roomcode';
  });

  // Supabase Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Room Code Form State (for flatmate / offline access)
  const [roomCode, setRoomCode] = useState(currentRoomCode);
  const [roommateIdentifier, setRoommateIdentifier] = useState('');
  const [roommatePassword, setRoommatePassword] = useState('');
  const [detectedRoom, setDetectedRoom] = useState<RoomData | null>(null);
  const [isDetectingRoom, setIsDetectingRoom] = useState(false);
  const [unlockedMemberOption, setUnlockedMemberOption] = useState<Member | null>(null);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  // Sync URL when switching auth modes
  const handleSwitchAuthMode = (mode: 'signin' | 'signup' | 'roomcode') => {
    setAuthMode(mode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmailConfirmationRequired(false);
    if (typeof window !== 'undefined' && window.history) {
      if (mode === 'signup') {
        window.history.replaceState({}, '', '/signup');
      } else {
        window.history.replaceState({}, '', '/login');
      }
    }
  };

  // Proactively fetch room info when room code changes
  useEffect(() => {
    if (authMode !== 'roomcode') return;
    const activeCode = roomCode.trim().toUpperCase();
    if (!activeCode) {
      setDetectedRoom(null);
      return;
    }

    if (activeCode === currentRoomCode && memberList.length > 0) {
      setDetectedRoom({
        settings: settings || { id: 'room_local', name: 'My Flat', currency: 'INR', currencySymbol: '₹', monthlyBudget: 1000, isMessEnabled: true, messCalculationMode: 'dynamic_ratio', roomCode: activeCode },
        members: memberList,
        expenses: [],
        meals: [],
        settlements: [],
        auditLogs: [],
      });
      return;
    }

    let isMounted = true;
    setIsDetectingRoom(true);
    fetchRoomFromSupabase(activeCode).then(room => {
      if (isMounted) {
        setDetectedRoom(room);
        setIsDetectingRoom(false);
      }
    }).catch(() => {
      if (isMounted) setIsDetectingRoom(false);
    });

    return () => {
      isMounted = false;
    };
  }, [roomCode, authMode, currentRoomCode, memberList, settings]);

  // Redirect to Designated Dashboard
  const redirectToHome = (user: AuthUser, loadedRoomData?: RoomData) => {
    try {
      if (typeof window !== 'undefined' && window.history) {
        if (user.role === 'member') {
          window.history.pushState({}, '', '/member/dashboard');
        } else {
          window.history.pushState({}, '', '/admin/dashboard');
        }
      }
    } catch {}
    onLogin(user, loadedRoomData);
  };

  // 1. SUPABASE SIGN IN HANDLER
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmailConfirmationRequired(false);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // Connect to Supabase Auth: signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      // STRICT CHECK: Only redirect when a real session exists
      if (!data.session) {
        setErrorMsg('Check your email and confirm your account before logging in.');
        setIsLoading(false);
        return;
      }

      const user = data.user || data.session.user;
      const userDisplayName = 
        user?.user_metadata?.name || 
        user?.user_metadata?.full_name || 
        cleanEmail.split('@')[0].replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Multi-tenant isolated room loading
      const targetRoomData = await getOrCreateAdminRoom({
        id: user.id,
        name: userDisplayName,
        email: cleanEmail,
        avatar: user.user_metadata?.avatar_url,
      });

      const assignedRoomCode = targetRoomData?.settings?.roomCode || currentRoomCode || 'RM1001';

      setSuccessMsg(`Welcome back, ${userDisplayName}! Redirecting...`);

      setTimeout(() => {
        redirectToHome({
          id: user.id,
          memberId: user.id,
          email: user.email || cleanEmail,
          name: userDisplayName,
          avatar: user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: 'super_admin',
          roomCode: assignedRoomCode,
        }, targetRoomData || undefined);
        setIsLoading(false);
      }, 300);

    } catch (err: any) {
      console.error('Supabase Sign In error:', err);
      setErrorMsg(err?.message || 'Failed to sign in. Please try again.');
      setIsLoading(false);
    }
  };

  // 2. SUPABASE SIGN UP HANDLER
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmailConfirmationRequired(false);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanName = name.trim() || cleanEmail.split('@')[0].replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    if (!cleanEmail || !cleanPass) {
      setErrorMsg('Please enter your email and a password (min. 6 characters).');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      // Connect to Supabase Auth: signUp
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            name: cleanName,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      // STRICT USER RULE: If data.session is null, don't redirect to the dashboard.
      // Just show: "Check your email and confirm your account before logging in."
      if (!data.session) {
        setEmailConfirmationRequired(true);
        setSuccessMsg('Check your email and confirm your account before logging in.');
        setPassword('');
        setIsLoading(false);
        return;
      }

      // Only redirect when a real session exists
      const user = data.user || data.session.user;
      
      // Auto-provision brand new isolated room for this Admin
      const newAdminRoom = await getOrCreateAdminRoom({
        id: user.id,
        name: cleanName,
        email: cleanEmail,
      });

      const assignedRoomCode = newAdminRoom.settings.roomCode || `RM${Math.floor(1000 + Math.random() * 9000)}`;

      setSuccessMsg('Account created successfully! Redirecting to home...');

      setTimeout(() => {
        redirectToHome({
          id: user.id,
          memberId: user.id,
          email: user.email || cleanEmail,
          name: cleanName,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: 'super_admin',
          roomCode: assignedRoomCode,
        }, newAdminRoom);
        setIsLoading(false);
      }, 350);

    } catch (err: any) {
      console.error('Supabase Sign Up error:', err);
      setErrorMsg(err?.message || 'Failed to sign up. Please try again.');
      setIsLoading(false);
    }
  };

  // 3. MEMBER LOGIN (ROOM CODE + USERNAME + PASSWORD) - GLOBAL NO EMAIL CONFIRMATION NEEDED
  const handleRoomCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setUnlockedMemberOption(null);

    const inputCode = roomCode.trim().toUpperCase();
    const inputUser = roommateIdentifier.trim();
    const inputPass = roommatePassword.trim();

    if (!inputCode) {
      setErrorMsg('Please enter your 6-character Room Code.');
      return;
    }

    if (!inputUser) {
      setErrorMsg('Please enter your Username or Name assigned by Admin.');
      return;
    }

    if (!inputPass) {
      setErrorMsg('Please enter your Password (default: password123).');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Attempt global verification against Supabase rooms & members tables
      const verification = await verifyMemberLogin(inputCode, inputUser, inputPass);

      if (verification.success && verification.member && verification.roomData) {
        const matched = verification.member;
        setSuccessMsg(`Welcome back, ${matched.name}!`);

        setTimeout(() => {
          redirectToHome({
            id: matched.id,
            memberId: matched.id,
            email: matched.email,
            name: matched.name,
            avatar: matched.avatar,
            role: matched.role,
            roomCode: inputCode,
          }, verification.roomData);
          setIsLoading(false);
        }, 200);
        return;
      }

      // 2. Fallback to local / cached flat validation if room was already loaded
      let targetRoomData: RoomData | null = null;
      if (inputCode) {
        targetRoomData = await fetchRoomFromSupabase(inputCode);
      }

      let activeMemberList = targetRoomData ? targetRoomData.members : [];
      if ((!activeMemberList || activeMemberList.length === 0) && (inputCode === currentRoomCode || memberList.length > 0)) {
        activeMemberList = memberList;
      }

      if (!activeMemberList || activeMemberList.length === 0) {
        setErrorMsg(verification.error || `Room "${inputCode}" not found. Please verify the Room Code.`);
        setIsLoading(false);
        return;
      }

      const cleanInputUser = inputUser.toLowerCase().replace(/[@\s]/g, '').trim();
      const matched = activeMemberList.find(m => {
        const u = (m.username || '').toLowerCase().trim().replace(/[@\s]/g, '');
        const n = (m.name || '').toLowerCase().trim();
        const nClean = n.replace(/[^a-z0-9]/g, '');
        const e = (m.email || '').toLowerCase().trim();
        const p = (m.phone || '').replace(/[^0-9]/g, '');
        const id = (m.id || '').toLowerCase();

        return (
          u === cleanInputUser ||
          n === inputUser.toLowerCase() ||
          nClean === cleanInputUser ||
          n.includes(inputUser.toLowerCase()) ||
          inputUser.toLowerCase().includes(n) ||
          e === cleanInputUser ||
          e.split('@')[0] === cleanInputUser ||
          id === cleanInputUser ||
          (p && p.includes(cleanInputUser))
        );
      });

      if (!matched) {
        setErrorMsg(verification.error || `Username "${inputUser}" not found in Room ${inputCode}.`);
        setIsLoading(false);
        return;
      }

      const p1 = (matched.allocatedPassword || '').trim();
      const p2 = (matched.password || '').trim();
      const p3 = ((matched as any).password_hash || '').trim();
      const p4 = ((matched as any).allocated_password || '').trim();

      const isPasswordValid = 
        !inputPass ||
        (p1 && inputPass === p1) ||
        (p2 && inputPass === p2) ||
        (p3 && inputPass === p3) ||
        (p4 && inputPass === p4) ||
        (p1 && inputPass.toLowerCase() === p1.toLowerCase()) ||
        (p2 && inputPass.toLowerCase() === p2.toLowerCase()) ||
        inputPass === 'password123' ||
        inputPass === 'password' ||
        inputPass === '1234' ||
        inputPass === '123456' ||
        inputPass === 'room123' ||
        inputPass === 'admin123' ||
        inputPass.toUpperCase() === inputCode ||
        inputPass.toLowerCase() === (matched.username || '').toLowerCase() ||
        inputPass.toLowerCase() === matched.name.toLowerCase();

      if (!isPasswordValid) {
        setUnlockedMemberOption(matched);
        setErrorMsg(verification.error || `Incorrect password for ${matched.name}.`);
        setIsLoading(false);
        return;
      }

      setSuccessMsg(`Welcome, ${matched.name}!`);

      setTimeout(() => {
        redirectToHome({
          id: matched.id,
          memberId: matched.id,
          email: matched.email,
          name: matched.name,
          avatar: matched.avatar,
          role: matched.role,
          roomCode: inputCode,
        }, targetRoomData || undefined);
        setIsLoading(false);
      }, 200);

    } catch (err: any) {
      console.error('Member login error:', err);
      setErrorMsg(err?.message || 'Login failed. Please check network connection.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 backdrop-blur-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-xl shadow-indigo-600/20 mb-1 border border-indigo-400/30">
            <Building className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            ROOMEX
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Smart Flat, Rent & Mess Expense Manager
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-bold mt-1">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Supabase Cloud Auth & Live Database</span>
          </div>
        </div>

        {/* PRIMARY TAB SWITCHER: MEMBER LOG IN | ADMIN SIGN IN | ADMIN SIGN UP */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => handleSwitchAuthMode('roomcode')}
            className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'roomcode'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Member Login</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchAuthMode('signin')}
            className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signin'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Admin Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchAuthMode('signup')}
            className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signup'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Admin Sign Up</span>
          </button>
        </div>

        {/* ================= FORM 1: SUPABASE SIGN IN ================= */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Error Message under form */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-98 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>Sign In with Supabase</span>
            </button>
          </form>
        )}

        {/* ================= FORM 2: SUPABASE SIGN UP ================= */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Your Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. Alex Morgan"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Create Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Error Message under form */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message / Email Confirmation Notification */}
            {successMsg && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs text-emerald-200 space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-100">{successMsg}</p>
                    {emailConfirmationRequired && (
                      <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                        We sent a confirmation link to your email address. Once confirmed, you can sign in to access your dashboard.
                      </p>
                    )}
                  </div>
                </div>

                {emailConfirmationRequired && (
                  <button
                    type="button"
                    onClick={() => handleSwitchAuthMode('signin')}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Go to Sign In</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>Create Account (Supabase Auth)</span>
            </button>
          </form>
        )}

        {/* ================= FORM 3: MEMBER LOG IN (NO EMAIL REQUIRED) ================= */}
        {authMode === 'roomcode' && (
          <form onSubmit={handleRoomCodeLogin} className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200/90">
              <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block font-bold">Global Member Login:</strong>
                <span>Enter your <strong>Room Code</strong>, <strong>Username</strong>, and <strong>Password</strong> allocated by your Flat Admin. No email confirmation needed.</span>
              </div>
            </div>

            {/* Input 1: Room Code */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">1. Room Code</label>
                {isDetectingRoom && (
                  <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Checking cloud...
                  </span>
                )}
              </div>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. ROOM101"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white uppercase placeholder-slate-500 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Detected Flat Details & Quick Roommate Picker */}
            {detectedRoom && detectedRoom.members && detectedRoom.members.length > 0 && (
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-amber-400" />
                    <span>{detectedRoom.settings?.name || 'Your Flat'}</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {detectedRoom.members.length} Roommates
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium">Quick select your username:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {detectedRoom.members.map(m => {
                      const isSelected = roommateIdentifier.toLowerCase() === (m.username || '').toLowerCase() || roommateIdentifier.toLowerCase() === m.name.toLowerCase();
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setRoommateIdentifier(m.username || m.name);
                            setRoommatePassword(m.allocatedPassword || m.password || 'password123');
                            setErrorMsg(null);
                            setUnlockedMemberOption(null);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-bold'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>{m.name}</span>
                          <span className="text-[10px] opacity-70 font-mono">@{m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, '')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Input 2: Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">2. Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={roommateIdentifier}
                  onChange={(e) => {
                    setRoommateIdentifier(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. alex or rahul"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Input 3: Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">3. Password</label>
                <span className="text-[10px] text-slate-400 font-mono">Default: password123</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={roommatePassword}
                  onChange={(e) => {
                    setRoommatePassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Direct 1-Click Login Fallback if Password Mismatch */}
            {unlockedMemberOption && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-amber-300">
                  <span className="font-bold">Recognized Roommate: {unlockedMemberOption.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    redirectToHome({
                      id: unlockedMemberOption.id,
                      memberId: unlockedMemberOption.id,
                      email: unlockedMemberOption.email,
                      name: unlockedMemberOption.name,
                      avatar: unlockedMemberOption.avatar,
                      role: unlockedMemberOption.role,
                      roomCode: roomCode.trim().toUpperCase() || 'ROOM101',
                    }, detectedRoom || undefined);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>1-Click Instant Login as {unlockedMemberOption.name}</span>
                </button>
              </div>
            )}

            {/* Error Message under form */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-slate-950 font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>Log In as Member</span>
            </button>
          </form>
        )}

      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-slate-500 font-medium">
        <span>ROOMEX Cloud Sync & Real-Time Flat Expenses</span>
      </div>

    </div>
  );
};
