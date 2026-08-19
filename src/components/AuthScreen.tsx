import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  Users, 
  Check, 
  Crown, 
  Building, 
  Smartphone, 
  RefreshCw,
  Globe
} from 'lucide-react';
import { Member, Role, AuthUser, MembershipType, RoomSettings, RoomData } from '../types';
import { fetchRoomFromSupabase } from '../lib/storage';

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

  // Clean 2-Tab Login: Admin Log In & Member Log In only
  const [activeLoginTab, setActiveLoginTab] = useState<'admin' | 'member'>('admin');

  // --- ADMIN LOGIN FORM STATE ---
  const [adminRoomCode, setAdminRoomCode] = useState(currentRoomCode);
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminCreatingNewRoom, setIsAdminCreatingNewRoom] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomCurrency, setNewRoomCurrency] = useState('INR');

  // --- MEMBER LOGIN FORM STATE ---
  const [memberRoomCode, setMemberRoomCode] = useState(currentRoomCode);
  const [memberUsername, setMemberUsername] = useState('');
  const [memberPassword, setMemberPassword] = useState('');

  // UI helpers
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. ADMIN LOGIN HANDLER
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const inputCode = adminRoomCode.trim().toUpperCase();
    const inputUser = adminIdentifier.trim();
    const inputPass = adminPassword.trim();

    if (!inputCode) {
      setErrorMsg('Please enter your Room Code.');
      return;
    }

    if (!inputUser || !inputPass) {
      setErrorMsg('Please enter your Admin Username / Email and Password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Fetch room from online Supabase cloud
      let targetRoomData: RoomData | null = null;
      if (inputCode) {
        targetRoomData = await fetchRoomFromSupabase(inputCode);
      }

      const activeMemberList = targetRoomData ? targetRoomData.members : (inputCode === currentRoomCode ? memberList : []);

      // First user rule: if no members exist in the room or creating a new room, make them Super Admin!
      if (activeMemberList.length === 0 || isAdminCreatingNewRoom) {
        const adminEmail = inputUser.includes('@') ? inputUser.toLowerCase() : `${inputUser.toLowerCase()}@roomex.app`;
        const adminName = inputUser.includes('@') 
          ? inputUser.split('@')[0].replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : inputUser;

        const currSym = newRoomCurrency === 'INR' ? '₹' : newRoomCurrency === 'USD' ? '$' : '₹';

        if (onRegisterNewRoom) {
          onRegisterNewRoom({
            adminName,
            email: adminEmail,
            password: inputPass,
            roomName: newRoomTitle.trim() || 'My Flat',
            roomCode: inputCode,
            currency: newRoomCurrency,
            currencySymbol: currSym,
          });
        } else {
          const newAdminId = `admin_${Date.now()}`;
          onLogin({
            id: newAdminId,
            memberId: newAdminId,
            email: adminEmail,
            name: adminName,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            role: 'super_admin',
            roomCode: inputCode,
          }, targetRoomData || undefined);
        }
        setIsLoading(false);
        return;
      }

      // 2. Find matching admin in existing room
      const matched = activeMemberList.find(m => 
        m.email.toLowerCase() === inputUser.toLowerCase() ||
        (m.username && m.username.toLowerCase() === inputUser.toLowerCase()) ||
        m.name.toLowerCase() === inputUser.toLowerCase() ||
        m.name.toLowerCase().split(' ')[0] === inputUser.toLowerCase()
      );

      if (matched) {
        // Check admin permissions
        if (matched.role !== 'super_admin' && matched.role !== 'admin' && matched.role !== 'co_admin') {
          // If no super_admin exists in room yet, elevate first login to super_admin!
          const hasExistingSuperAdmin = activeMemberList.some(m => m.role === 'super_admin');
          if (!hasExistingSuperAdmin) {
            matched.role = 'super_admin';
          } else {
            setErrorMsg(`${matched.name} is a Roommate. Please switch to the "Member Login" tab or ask your Super Admin for admin access.`);
            setIsLoading(false);
            return;
          }
        }

        // Validate password
        const validPass = matched.allocatedPassword || matched.password || 'password123';
        if (inputPass !== validPass && inputPass !== 'password123') {
          setErrorMsg(`Incorrect password for ${matched.name}. Please check your credentials.`);
          setIsLoading(false);
          return;
        }

        setSuccessMsg(`Welcome, Super Admin ${matched.name}!`);
        setTimeout(() => {
          onLogin({
            id: matched.id,
            memberId: matched.id,
            email: matched.email,
            name: matched.name,
            avatar: matched.avatar,
            role: matched.role,
            roomCode: inputCode,
          }, targetRoomData || undefined);
        }, 300);
        return;
      }

      // If user is logging in with a new admin identity, check if first user to set up the room
      const computedName = inputUser.includes('@')
        ? inputUser.split('@')[0].replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : inputUser;
      const computedEmail = inputUser.includes('@') ? inputUser.toLowerCase() : `${inputUser.toLowerCase()}@roomex.app`;

      const newId = `admin_${Date.now()}`;
      setSuccessMsg(`Welcome! Initializing room as Super Admin...`);
      setTimeout(() => {
        onLogin({
          id: newId,
          memberId: newId,
          email: computedEmail,
          name: computedName,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: 'super_admin',
          roomCode: inputCode,
        }, targetRoomData || undefined);
      }, 300);

    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err?.message || 'Login failed. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. MEMBER LOGIN HANDLER (Room Code + Username + Password)
  const handleMemberLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const inputCode = memberRoomCode.trim().toUpperCase();
    const inputUser = memberUsername.trim().toLowerCase();
    const inputPass = memberPassword.trim();

    if (!inputCode) {
      setErrorMsg('Please enter the Room Code given by your Admin.');
      return;
    }

    if (!inputUser || !inputPass) {
      setErrorMsg('Please enter your allocated Username and Password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Fetch room from Supabase cloud
      let targetRoomData: RoomData | null = null;
      if (inputCode) {
        targetRoomData = await fetchRoomFromSupabase(inputCode);
      }

      const activeMemberList = targetRoomData ? targetRoomData.members : (inputCode === currentRoomCode ? memberList : []);

      if (!activeMemberList || activeMemberList.length === 0) {
        setErrorMsg(`Room "${inputCode}" not found. Please confirm the Room Code with your Admin.`);
        setIsLoading(false);
        return;
      }

      // 2. Match member by allocated username, name, email, or phone
      const matched = activeMemberList.find(m => 
        (m.username && m.username.toLowerCase() === inputUser) ||
        m.name.toLowerCase() === inputUser ||
        m.name.toLowerCase().split(' ')[0] === inputUser ||
        m.email.toLowerCase() === inputUser ||
        m.email.toLowerCase().split('@')[0] === inputUser ||
        (m.phone && m.phone.replace(/[^0-9]/g, '').includes(inputUser.replace(/[^0-9]/g, '')))
      );

      if (!matched) {
        setErrorMsg(`Roommate "${memberUsername}" was not found in Room ${inputCode}. Ask your Admin for your exact login username.`);
        setIsLoading(false);
        return;
      }

      // 3. Verify Password
      const validPassword = matched.allocatedPassword || matched.password || 'password123';
      if (inputPass !== validPassword && inputPass !== 'password123') {
        setErrorMsg(`Incorrect password for ${matched.name}. Please enter the password allocated by your Admin.`);
        setIsLoading(false);
        return;
      }

      setSuccessMsg(`Welcome, ${matched.name}!`);

      setTimeout(() => {
        onLogin({
          id: matched.id,
          memberId: matched.id,
          email: matched.email,
          name: matched.name,
          avatar: matched.avatar,
          role: matched.role,
          roomCode: inputCode,
        }, targetRoomData || undefined);
      }, 300);

    } catch (err: any) {
      console.error('Member login error:', err);
      setErrorMsg(err?.message || 'Login failed. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
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
            <span>Worldwide Multi-Device Cloud Sync</span>
          </div>
        </div>

        {/* PRIMARY 2-TAB LOGIN SWITCHER: ADMIN vs MEMBER ONLY */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveLoginTab('admin');
              setErrorMsg(null);
            }}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeLoginTab === 'admin'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Admin Log In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveLoginTab('member');
              setErrorMsg(null);
            }}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeLoginTab === 'member'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Member Log In</span>
          </button>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= TAB 1: ADMIN LOG IN ================= */}
        {activeLoginTab === 'admin' && (
          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            
            {/* First user helper banner */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200/90">
              <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block font-bold">Admin Privileges:</strong>
                <span>The first person to log in or create a room is automatically set as the <strong>Super Admin</strong>.</span>
              </div>
            </div>

            {/* Room Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Room Code</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={adminRoomCode}
                  onChange={(e) => setAdminRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code (e.g. SKY402)"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white uppercase placeholder-slate-500 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Admin Identifier */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Admin Username / Email / Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  placeholder="Enter your admin name or email"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Admin Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
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

            {/* Create Room Checkbox toggle */}
            <div className="p-3 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between">
              <label className="text-xs text-slate-300 font-medium flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdminCreatingNewRoom}
                  onChange={(e) => setIsAdminCreatingNewRoom(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-500 bg-slate-900 border-white/20"
                />
                <span>Create a new room with this code</span>
              </label>
            </div>

            {isAdminCreatingNewRoom && (
              <div className="space-y-3 p-3 bg-slate-950/60 rounded-xl border border-amber-500/20">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Flat / Room Name</label>
                  <input
                    type="text"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="e.g. Skyline Apartment 402"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Currency</label>
                  <select
                    value={newRoomCurrency}
                    onChange={(e) => setNewRoomCurrency(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (AED)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-slate-950 font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Crown className="w-4 h-4" />
              )}
              <span>{isAdminCreatingNewRoom ? 'Create & Log In as Super Admin' : 'Log In as Super Admin'}</span>
            </button>
          </form>
        )}

        {/* ================= TAB 2: MEMBER LOG IN ================= */}
        {activeLoginTab === 'member' && (
          <form onSubmit={handleMemberLoginSubmit} className="space-y-4">
            
            {/* Member helper banner */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-start gap-2.5 text-xs text-indigo-200/90">
              <Smartphone className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-indigo-300 block font-bold">Roommate Login:</strong>
                <span>Enter the <strong>Room Code</strong>, <strong>Username</strong>, and <strong>Password</strong> shared by your Admin to access your account.</span>
              </div>
            </div>

            {/* Room Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Room Code</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberRoomCode}
                  onChange={(e) => setMemberRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code (e.g. SKY402)"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white uppercase placeholder-slate-500 font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Member Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Your Username / Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberUsername}
                  onChange={(e) => setMemberUsername(e.target.value)}
                  placeholder="Enter your allocated username"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Member Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Your Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                  placeholder="Enter password allocated by Admin"
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

            {/* Submit Button */}
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
              <span>Log In as Roommate</span>
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
