import React, { useState } from 'react';
import { 
  Crown, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  UserX, 
  Users, 
  Check, 
  X, 
  Calendar, 
  Utensils, 
  KeyRound, 
  History, 
  AlertTriangle,
  ArrowRight,
  Edit2,
  Sparkles,
  DollarSign,
  Share2,
  Lock,
  Smartphone,
  Copy,
  Eye,
  EyeOff,
  Palmtree,
  Plane,
  Power,
  RefreshCw,
  Sun,
  Clock,
  Sparkle,
  Trash2
} from 'lucide-react';
import { Member, Role, MemberPermissions, AuditLog, MembershipType, RoomSettings } from '../types';
import { DEFAULT_PERMISSIONS } from '../lib/storage';
import { ConfirmDialog } from './ConfirmDialog';

interface SuperAdminTabProps {
  members: Member[];
  activeMember: Member;
  settings: RoomSettings;
  auditLogs: AuditLog[];
  onUpdateMemberRole: (targetMemberId: string, newRole: Role, updatedPermissions?: MemberPermissions) => void;
  onAddNewMember: (
    name: string, 
    email: string, 
    role: Role, 
    deposit: number, 
    membershipType: MembershipType,
    username?: string,
    password?: string,
    phone?: string,
    upiId?: string
  ) => void;
  onRemoveMember: (memberId: string) => void;
  onSelectActiveMember: (memberId: string) => void;
  onUpdateSettings?: (settings: RoomSettings) => void;
  onUpdateMemberDaysStayed?: (memberId: string, days: number) => void;
  onUpdateMemberMembershipType?: (memberId: string, type: MembershipType) => void;
  onUpdateMemberParticipation?: (
    memberId: string, 
    params: {
      isOnVacation: boolean;
      vacationType?: 'vacation' | 'long_leave' | 'inactive' | 'active';
      vacationReason?: string;
      vacationStartDate?: string;
      vacationEndDate?: string;
      daysStayed?: number;
      isMessActive?: boolean;
      isCleaningActive?: boolean;
    }
  ) => void;
  onBulkUpdateParticipation?: (allOnVacation: boolean, reason?: string) => void;
}

export const SuperAdminTab: React.FC<SuperAdminTabProps> = ({
  members,
  activeMember,
  settings,
  auditLogs,
  onUpdateMemberRole,
  onAddNewMember,
  onRemoveMember,
  onSelectActiveMember,
  onUpdateSettings,
  onUpdateMemberDaysStayed,
  onUpdateMemberMembershipType,
  onUpdateMemberParticipation,
  onBulkUpdateParticipation,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'vacation' | 'add_member' | 'audit'>('members');
  const [selectedMemberForPerms, setSelectedMemberForPerms] = useState<string | null>(null);
  const [transferOwnerModal, setTransferOwnerModal] = useState<Member | null>(null);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  
  // Vacation / Participation Modal State
  const [vacationModalMember, setVacationModalMember] = useState<Member | null>(null);
  const [vacationType, setVacationType] = useState<'vacation' | 'long_leave' | 'inactive' | 'active'>('vacation');
  const [vacationReason, setVacationReason] = useState('Home Town Trip / Vacation');
  const [vacationStartDate, setVacationStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [vacationEndDate, setVacationEndDate] = useState('');
  const [pauseMess, setPauseMess] = useState(true);
  const [pauseCleaning, setPauseCleaning] = useState(true);

  // Bulk Vacation Modal
  const [bulkVacationModalOpen, setBulkVacationModalOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState('Flat Vacation / Semester Break');

  // Add Member State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>('member');
  const [newMembershipType, setNewMembershipType] = useState<MembershipType>('both');
  const [newDeposit, setNewDeposit] = useState('0');

  // Strict Super Admin Access Guard
  if (activeMember.role !== 'super_admin') {
    return (
      <div className="p-8 text-center bg-slate-900 border border-rose-500/30 rounded-2xl space-y-4 max-w-lg mx-auto my-8 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Super Admin Access Only</h2>
        <p className="text-sm text-slate-400">
          This panel is restricted exclusively to the Super Admin ({members.find(m => m.role === 'super_admin')?.name || 'Room Creator'}).
        </p>
      </div>
    );
  }

  const handlePromoteToAdmin = (targetMember: Member) => {
    const updatedPerms = { ...DEFAULT_PERMISSIONS['admin'] };
    onUpdateMemberRole(targetMember.id, 'admin', updatedPerms);
  };

  const handleDemoteToMember = (targetMember: Member) => {
    const updatedPerms = { ...DEFAULT_PERMISSIONS['member'] };
    onUpdateMemberRole(targetMember.id, 'member', updatedPerms);
  };

  const handleSetCoAdmin = (targetMember: Member) => {
    const updatedPerms = { ...DEFAULT_PERMISSIONS['co_admin'] };
    onUpdateMemberRole(targetMember.id, 'co_admin', updatedPerms);
  };

  const handleTransferOwnership = (targetMember: Member) => {
    if (window.confirm(`Are you sure you want to transfer Super Admin ownership to "${targetMember.name}"? You will become a regular Admin.`)) {
      onUpdateMemberRole(targetMember.id, 'super_admin', DEFAULT_PERMISSIONS['super_admin']);
      onUpdateMemberRole(activeMember.id, 'admin', DEFAULT_PERMISSIONS['admin']);
      setTransferOwnerModal(null);
    }
  };

  const handleTogglePermission = (targetMember: Member, permKey: keyof MemberPermissions) => {
    const updatedPermissions = {
      ...targetMember.permissions,
      [permKey]: !targetMember.permissions[permKey],
    };
    onUpdateMemberRole(targetMember.id, targetMember.role, updatedPermissions);
  };

  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!newUsername || newUsername === newName.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      setNewUsername(val.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  };

  const handleCreateMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const depositNum = parseFloat(newDeposit) || 0;
    const cleanUName = (newUsername.trim() || newName.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();
    const cleanPass = newPassword.trim() || 'password123';
    const generatedEmail = newEmail.trim() || `${cleanUName}@roomex.app`;

    onAddNewMember(
      newName.trim(),
      generatedEmail,
      newRole,
      depositNum,
      newMembershipType,
      cleanUName,
      cleanPass,
      newPhone.trim() || undefined
    );

    setNewName('');
    setNewUsername('');
    setNewPassword('password123');
    setNewEmail('');
    setNewPhone('');
    setNewDeposit('0');
    setActiveSubTab('members');
  };

  const handleShareCredentialsWhatsApp = (m: Member) => {
    const uName = m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pass = m.allocatedPassword || m.password || 'password123';
    const text = `🏠 *ROOMEX Credentials for ${settings.name}*\n\nHi ${m.name}!\nHere are your login details:\n• *Room Code:* ${settings.roomCode}\n• *Username:* ${uName}\n• *Password:* ${pass}\n• *Role:* ${m.role.toUpperCase().replace('_', ' ')}\n\nLogin at: https://roomex.app`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyCredentials = (m: Member) => {
    const uName = m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pass = m.allocatedPassword || m.password || 'password123';
    const text = `Room: ${settings.name} (${settings.roomCode})\nUsername: ${uName}\nPassword: ${pass}`;
    navigator.clipboard.writeText(text);
    setCopiedMemberId(m.id);
    setTimeout(() => setCopiedMemberId(null), 2000);
  };

  const togglePasswordReveal = (mId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [mId]: !prev[mId],
    }));
  };

  const openVacationModal = (m: Member) => {
    setVacationModalMember(m);
    setVacationType(m.vacationType || (m.isOnVacation ? 'vacation' : 'vacation'));
    setVacationReason(m.vacationReason || 'Home Town Trip / Vacation');
    setVacationStartDate(m.vacationStartDate || new Date().toISOString().split('T')[0]);
    setVacationEndDate(m.vacationEndDate || '');
    setPauseMess(m.isMessActive === false ? true : true);
    setPauseCleaning(m.isCleaningActive === false ? true : true);
  };

  const handleSaveVacationModal = () => {
    if (!vacationModalMember || !onUpdateMemberParticipation) return;

    const isSettingVacation = vacationType !== 'active';
    onUpdateMemberParticipation(vacationModalMember.id, {
      isOnVacation: isSettingVacation,
      vacationType: isSettingVacation ? vacationType : 'active',
      vacationReason: isSettingVacation ? vacationReason : undefined,
      vacationStartDate: isSettingVacation ? vacationStartDate : undefined,
      vacationEndDate: isSettingVacation ? vacationEndDate : undefined,
      isMessActive: isSettingVacation ? !pauseMess : true,
      isCleaningActive: isSettingVacation ? !pauseCleaning : true,
      daysStayed: isSettingVacation ? 0 : (settings.daysInMonth || 30),
    });

    setVacationModalMember(null);
  };

  const handleQuickToggleVacation = (m: Member) => {
    if (!onUpdateMemberParticipation) return;
    const nextVacationState = !m.isOnVacation;
    onUpdateMemberParticipation(m.id, {
      isOnVacation: nextVacationState,
      vacationType: nextVacationState ? 'vacation' : 'active',
      vacationReason: nextVacationState ? 'Vacation / Out of Station' : undefined,
      isMessActive: !nextVacationState,
      isCleaningActive: !nextVacationState,
      daysStayed: nextVacationState ? 0 : (settings.daysInMonth || 30),
    });
  };

  const handleBulkVacationSubmit = (allOnVacation: boolean) => {
    if (onBulkUpdateParticipation) {
      onBulkUpdateParticipation(allOnVacation, bulkReason);
    }
    setBulkVacationModalOpen(false);
  };

  const daysInMonth = settings.daysInMonth || 30;
  const onVacationCount = members.filter(m => m.isOnVacation).length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Super Admin Top Badge & Banner */}
      <div className="p-5 bg-gradient-to-r from-amber-950/50 via-slate-900 to-indigo-950/40 border border-amber-500/40 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/20">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Super Admin Control Center</h2>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                Master Authority
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage roommate credentials, remove members, set Vacation/Long-leave participation (for yourself & roommates), and promote admins.
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-white/10 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setActiveSubTab('members')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'members'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roommates ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vacation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'vacation'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palmtree className="w-3.5 h-3.5" />
            <span>Vacation & Participation {onVacationCount > 0 && `(${onVacationCount} Away)`}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('add_member')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'add_member'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Roommate</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'audit'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Log</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: MEMBERS LIST & ALLOCATED CREDENTIALS & REMOVAL */}
      {activeSubTab === 'members' && (
        <div className="space-y-3">
          
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Room Code: <strong className="text-white font-mono">{settings.roomCode}</strong></span>
            <span>Click WhatsApp icon to send login details directly to roommate</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {members.map((member) => {
              const isSuper = member.role === 'super_admin';
              const isAdmin = member.role === 'admin';
              const isCoAdmin = member.role === 'co_admin';
              const memDays = member.daysStayedInMonth ?? daysInMonth;
              const uName = member.username || member.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const pass = member.allocatedPassword || member.password || 'password123';
              const isPassRevealed = revealedPasswords[member.id];
              const isOnVacation = !!member.isOnVacation;

              return (
                <div 
                  key={member.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSuper 
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5' 
                      : isAdmin 
                        ? 'bg-indigo-950/20 border-indigo-500/40' 
                        : 'bg-slate-900 border-white/10'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Member Identity & Allocated Credentials */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-12 h-12 rounded-2xl object-cover border border-white/10 shrink-0" 
                      />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm sm:text-base">{member.name}</span>
                          
                          {isSuper && (
                            <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                              <Crown className="w-3 h-3 text-amber-400" /> Super Admin
                            </span>
                          )}

                          {isAdmin && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-mono">
                              <ShieldCheck className="w-3 h-3 text-indigo-400" /> Admin
                            </span>
                          )}

                          {isCoAdmin && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono">
                              Co-Admin
                            </span>
                          )}

                          {!isSuper && !isAdmin && !isCoAdmin && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 font-mono">
                              Member
                            </span>
                          )}

                          {/* Vacation Badge */}
                          {isOnVacation ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Palmtree className="w-3 h-3" /> On Vacation / Away
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active (In Flat)
                            </span>
                          )}

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                            {member.membershipType === 'rent_only' ? 'Rent Only' : member.membershipType === 'mess_only' ? 'Mess Only' : 'Rent + Mess'}
                          </span>
                        </div>

                        {/* Allocated Credentials Row */}
                        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-white/10 text-indigo-300 font-semibold">
                            Username: @{uName}
                          </span>

                          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-white/10 text-slate-300 flex items-center gap-1">
                            Password: <strong className="text-amber-300">{isPassRevealed ? pass : '••••••••'}</strong>
                            <button
                              type="button"
                              onClick={() => togglePasswordReveal(member.id)}
                              className="text-slate-500 hover:text-slate-300 ml-0.5 cursor-pointer"
                            >
                              {isPassRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(member)}
                            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy credentials"
                          >
                            {copiedMemberId === member.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedMemberId === member.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareCredentialsWhatsApp(member)}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 transition-colors font-bold cursor-pointer"
                            title="Share credentials on WhatsApp"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                          <span>{member.email}</span>
                          <span>•</span>
                          <span>Stayed: <strong className="text-slate-200">{memDays} days</strong></span>
                          {member.phone && <span>• Tel: {member.phone}</span>}
                          {member.vacationReason && isOnVacation && (
                            <span className="text-amber-400 italic font-sans">• Reason: {member.vacationReason}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Super Admin Control Actions */}
                    <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                      
                      {/* Vacation / Leave Modal Trigger */}
                      <button
                        onClick={() => openVacationModal(member)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isOnVacation
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                        title="Set Vacation / Long Leave / Participation"
                      >
                        <Palmtree className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isOnVacation ? 'On Vacation' : 'Set Leave'}</span>
                      </button>

                      {/* Promote / Demote Admin Buttons */}
                      {!isSuper && (
                        <>
                          {isAdmin ? (
                            <button
                              onClick={() => handleDemoteToMember(member)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Revoke Admin status"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Revoke Admin</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePromoteToAdmin(member)}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Promote to Room Admin"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Make Admin</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Stayed Days Increment / Decrement */}
                      {onUpdateMemberDaysStayed && (
                        <div className="inline-flex items-center bg-slate-950 border border-white/10 rounded-xl p-1 gap-1">
                          <span className="text-[10px] text-slate-500 font-mono pl-1">Days:</span>
                          <button
                            onClick={() => onUpdateMemberDaysStayed(member.id, Math.max(0, memDays - 1))}
                            className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold font-mono text-white px-1">{memDays}</span>
                          <button
                            onClick={() => onUpdateMemberDaysStayed(member.id, Math.min(daysInMonth, memDays + 1))}
                            className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {/* Remove Roommate Button (Super Admin & Admin can remove) */}
                      {!isSuper && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to permanently remove "${member.name}" from this room? Their cleaning rota assignment and access credentials will be revoked.`)) {
                              onRemoveMember(member.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors cursor-pointer"
                          title="Remove Roommate"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}

                      {/* Permissions Matrix Toggle */}
                      <button
                        onClick={() => setSelectedMemberForPerms(selectedMemberForPerms === member.id ? null : member.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                        title="Permissions Matrix"
                      >
                        <KeyRound className="w-4 h-4 text-slate-400" />
                      </button>

                    </div>

                  </div>

                  {/* Expanded Permissions Matrix */}
                  {selectedMemberForPerms === member.id && (
                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in">
                      {Object.keys(DEFAULT_PERMISSIONS.member).map((key) => {
                        const permKey = key as keyof MemberPermissions;
                        const isGranted = !!member.permissions?.[permKey];
                        const permLabels: Record<string, string> = {
                          canAddExpense: 'Add Expenses',
                          canEditAnyExpense: 'Edit All Expenses',
                          canDeleteAnyExpense: 'Delete Expenses',
                          canManageMess: 'Manage Mess & Rates',
                          canManageCleaningRota: 'Manage Cleaning Rota',
                          canManageMembers: 'Manage Members',
                          canEditRoomSettings: 'Change Room Settings',
                          canViewAuditLogs: 'View Audit Logs',
                          canGrantAdmin: 'Grant Admin Roles',
                        };

                        return (
                          <button
                            key={permKey}
                            type="button"
                            onClick={() => handleTogglePermission(member, permKey)}
                            disabled={isSuper}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                              isGranted
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-white/[0.02] border-white/5 text-slate-500'
                            } ${isSuper ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <span className="truncate pr-1">{permLabels[permKey] || permKey}</span>
                            {isGranted ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* SUB-TAB 2: VACATION & PARTICIPATION MANAGER (FOR MYSELF & ALL MEMBERS) */}
      {activeSubTab === 'vacation' && (
        <div className="space-y-4">
          
          {/* Header Action Bar */}
          <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-amber-400" />
                Vacation & Participation Roster
              </h3>
              <p className="text-xs text-slate-400">
                When a member is on Vacation or Long Leave, their daily Mess cost and Cleaning Rota duties are automatically paused.
              </p>
            </div>

            {/* Bulk Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBulkVacationModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Bulk Flat Vacation</span>
              </button>

              {onVacationCount > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Resume full participation (Mess & Cleaning) for ALL roommates?')) {
                      handleBulkVacationSubmit(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resume All ({onVacationCount} Away)</span>
                </button>
              )}
            </div>
          </div>

          {/* Members Vacation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((member) => {
              const isMyself = member.id === activeMember.id;
              const isOnVacation = !!member.isOnVacation;

              return (
                <div 
                  key={member.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isOnVacation
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-md shadow-amber-500/5'
                      : 'bg-slate-900/90 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    <div className="flex items-center gap-3">
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" 
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-sm">{member.name}</span>
                          {isMyself && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                              (Myself)
                            </span>
                          )}
                          {member.role === 'super_admin' && (
                            <Crown className="w-3 h-3 text-amber-400" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {isOnVacation ? (
                            <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                              <Palmtree className="w-3.5 h-3.5" />
                              {member.vacationType === 'long_leave' ? 'Long Leave' : 'On Vacation'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <Check className="w-3.5 h-3.5" />
                              Active (Full Mess & Cleaning)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Toggle Button */}
                    <button
                      onClick={() => openVacationModal(member)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isOnVacation
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {isOnVacation ? 'Edit Leave' : 'Set Vacation'}
                    </button>

                  </div>

                  {/* Status details */}
                  {isOnVacation && (
                    <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-1 text-xs text-slate-300 bg-black/20 p-2.5 rounded-xl">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reason:</span>
                        <span className="font-medium text-amber-300">{member.vacationReason || 'Vacation / Out of Station'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mess Participation:</span>
                        <span className="font-mono text-rose-300">{member.isMessActive === false ? 'PAUSED (0 Days Mess Bill)' : 'ACTIVE'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cleaning Duty Rota:</span>
                        <span className="font-mono text-rose-300">{member.isCleaningActive === false ? 'SKIPPED / PAUSED' : 'ACTIVE'}</span>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* SUB-TAB 3: ADD ROOMMATE FORM */}
      {activeSubTab === 'add_member' && (
        <div className="max-w-xl mx-auto p-6 bg-slate-900 border border-white/10 rounded-2xl space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              Allocate Credentials for New Roommate
            </h3>
            <p className="text-xs text-slate-400">
              Create an account for your flatmate. They will use the assigned Username and Password to log in with Room Code <strong className="text-white font-mono">{settings.roomCode}</strong>.
            </p>
          </div>

          <form onSubmit={handleCreateMemberSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Roommate Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Jordan Lee"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Allocated Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jordan"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Allocated Password *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jordan123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp Phone (for 1-click share)</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="jordan@roomex.app"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Initial Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="member">Regular Member (Standard Split & Mess)</option>
                  <option value="co_admin">Co-Admin (Can manage meals & expenses)</option>
                  <option value="admin">Room Admin (Full expense & delegation control)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Membership Plan</label>
                <select
                  value={newMembershipType}
                  onChange={(e) => setNewMembershipType(e.target.value as MembershipType)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="both">Both (Room Rent + Mess Meals)</option>
                  <option value="rent_only">Rent Only (No mess bills)</option>
                  <option value="mess_only">Mess Only (No rent shares)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Initial Mess Advance Deposit ({settings.currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newDeposit}
                onChange={(e) => setNewDeposit(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('members')}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Allocate & Add Roommate</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 4: AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              Administrative Audit Trail ({auditLogs.length} Events)
            </h3>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 bg-slate-900 border border-white/5 rounded-2xl">
              No audit events recorded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {auditLogs.slice().reverse().map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-900/80 border border-white/10 rounded-xl flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-300 font-semibold">{log.actorName}</span>
                    </div>
                    <p className="text-slate-400 mt-1">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VACATION / LONG-LEAVE MODAL */}
      {vacationModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in font-sans">
          <div 
            className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Set Leave / Vacation Status
                  </h3>
                  <p className="text-xs text-slate-400">
                    Roommate: <strong className="text-white">{vacationModalMember.name}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setVacationModalMember(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Participation Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVacationType('vacation')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      vacationType === 'vacation'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <Palmtree className="w-4 h-4" /> Short Vacation
                    </span>
                    <span className="text-[10px] text-slate-400">Trip / Hometown visit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVacationType('long_leave')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      vacationType === 'long_leave'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <Plane className="w-4 h-4" /> Long Leave
                    </span>
                    <span className="text-[10px] text-slate-400">Multiple weeks away</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVacationType('inactive')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      vacationType === 'inactive'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <Power className="w-4 h-4" /> Temp Inactive
                    </span>
                    <span className="text-[10px] text-slate-400">Pause all involvement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVacationType('active')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      vacationType === 'active'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" /> Active in Flat
                    </span>
                    <span className="text-[10px] text-slate-400">Full participation</span>
                  </button>
                </div>
              </div>

              {vacationType !== 'active' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Home town visit, Office trip"
                      value={vacationReason}
                      onChange={(e) => setVacationReason(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={vacationStartDate}
                        onChange={(e) => setVacationStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Return Date</label>
                      <input
                        type="date"
                        value={vacationEndDate}
                        onChange={(e) => setVacationEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={pauseMess}
                        onChange={(e) => setPauseMess(e.target.checked)}
                        className="rounded bg-slate-950 border-white/10 text-amber-500 focus:ring-0"
                      />
                      <span>Pause Mess Daily Bill Calculation (0 Days)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={pauseCleaning}
                        onChange={(e) => setPauseCleaning(e.target.checked)}
                        className="rounded bg-slate-950 border-white/10 text-amber-500 focus:ring-0"
                      />
                      <span>Skip from Cleaning Schedule Rota</span>
                    </label>
                  </div>
                </>
              )}

            </div>

            <div className="px-6 py-3.5 border-t border-white/10 flex justify-end gap-2 bg-slate-950/60">
              <button
                onClick={() => setVacationModalMember(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVacationModal}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
              >
                Save Participation Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK VACATION MODAL */}
      {bulkVacationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in font-sans">
          <div 
            className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Bulk Flat Vacation Mode
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pause all flatmates for semester/holiday breaks
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setBulkVacationModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                This will set <strong>ALL roommates ({members.length})</strong> on Vacation status, pausing daily Mess purchases calculation and Cleaning Rota duties until resumed.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Vacation Occasion</label>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="e.g. Diwali Vacation, Semester Break, Summer Holiday"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-white/10 flex justify-end gap-2 bg-slate-950/60">
              <button
                onClick={() => setBulkVacationModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkVacationSubmit(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
              >
                Set All on Vacation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
