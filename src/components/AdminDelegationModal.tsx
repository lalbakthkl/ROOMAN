import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  UserPlus, 
  UserCheck, 
  Check, 
  X, 
  History, 
  KeyRound, 
  Crown, 
  AlertTriangle,
  Users,
  Shield,
  Trash2,
  UserX,
  Share2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { Member, Role, MemberPermissions, AuditLog, MembershipType } from '../types';
import { DEFAULT_PERMISSIONS } from '../lib/storage';

interface AdminDelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  activeMember: Member;
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
  onRemoveMember?: (memberId: string) => void;
  onSelectActiveMember?: (memberId: string) => void;
}

export const AdminDelegationModal: React.FC<AdminDelegationModalProps> = ({
  isOpen,
  onClose,
  members,
  activeMember,
  auditLogs,
  onUpdateMemberRole,
  onAddNewMember,
  onRemoveMember,
  onSelectActiveMember,
}) => {
  const [activeTab, setActiveTab] = useState<'delegation' | 'add_member' | 'audit_log'>('delegation');
  const [selectedMemberForCustom, setSelectedMemberForCustom] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  
  // Add Member Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDeposit, setNewDeposit] = useState('0');
  const [newRole, setNewRole] = useState<Role>('member');
  const [newMembershipType, setNewMembershipType] = useState<MembershipType>('both');

  if (!isOpen) return null;

  const isActorAdmin = 
    activeMember.role === 'super_admin' || 
    activeMember.role === 'admin' || 
    activeMember.permissions?.canGrantAdmin;

  const handleRoleChange = (targetMember: Member, role: Role) => {
    if (!isActorAdmin) {
      alert('Only Room Admins or Super Admins can delegate administrative roles.');
      return;
    }

    if (targetMember.role === 'super_admin' && activeMember.role !== 'super_admin') {
      alert('Only the Super Admin can modify the Super Admin account.');
      return;
    }

    const defaultPerms = { ...DEFAULT_PERMISSIONS[role] };
    onUpdateMemberRole(targetMember.id, role, defaultPerms);
  };

  const handleTogglePermission = (targetMember: Member, permKey: keyof MemberPermissions) => {
    if (!isActorAdmin) {
      alert('Only Room Admins can modify granular permissions.');
      return;
    }

    const updatedPermissions = {
      ...targetMember.permissions,
      [permKey]: !targetMember.permissions[permKey],
    };

    onUpdateMemberRole(targetMember.id, targetMember.role, updatedPermissions);
  };

  const handleNameInput = (val: string) => {
    setNewName(val);
    if (!newUsername || newUsername === newName.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      setNewUsername(val.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  };

  const handleCreateMember = (e: React.FormEvent) => {
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
    setActiveTab('delegation');
  };

  const handleRemoveMemberClick = (targetMember: Member) => {
    if (!isActorAdmin) {
      alert('Only Room Admins can remove members.');
      return;
    }

    if (targetMember.role === 'super_admin') {
      alert('Cannot remove the Super Admin of the room.');
      return;
    }

    if (members.length <= 1) {
      alert('Cannot remove the last member of the room.');
      return;
    }

    if (confirm(`Are you sure you want to remove ${targetMember.name} from this room? Their active rota assignment and member profile will be removed.`)) {
      if (onRemoveMember) {
        onRemoveMember(targetMember.id);
      }
    }
  };

  const handleShareCredentialsWhatsApp = (m: Member) => {
    const uName = m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pass = m.allocatedPassword || m.password || 'password123';
    const text = `🏠 *ROOMEX Login Details*\n\nHi ${m.name}!\n• *Username:* ${uName}\n• *Password:* ${pass}\n• *Role:* ${m.role.toUpperCase().replace('_', ' ')}\n\nLogin at: https://roomex.app`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyCredentials = (m: Member) => {
    const uName = m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pass = m.allocatedPassword || m.password || 'password123';
    const text = `Username: ${uName}\nPassword: ${pass}`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in font-sans">
      <div 
        className="bg-slate-900 border border-white/10 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Room Members & Admin Delegation
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  {members.length} Roommates
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Logged in as <span className="text-white font-semibold">{activeMember.name}</span> ({activeMember.role.replace('_', ' ').toUpperCase()})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-slate-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('delegation')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'delegation'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Roommates & Credentials
          </button>

          <button
            onClick={() => setActiveTab('add_member')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'add_member'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            + Allocate New Roommate
          </button>

          <button
            onClick={() => setActiveTab('audit_log')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'audit_log'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Logs ({auditLogs.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: MEMBERS & DELEGATION */}
          {activeTab === 'delegation' && (
            <div className="space-y-4">
              
              {/* Guidance note */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 leading-relaxed flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Admin Governance:</strong> As an Admin, you can allocate credentials to new members, promote roommates to Admin/Co-Admin, and manage granular permissions.
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                {members.map((member) => {
                  const isSuper = member.role === 'super_admin';
                  const isAdmin = member.role === 'admin';
                  const isCoAdmin = member.role === 'co_admin';
                  const isCurrentActive = member.id === activeMember.id;
                  const uName = member.username || member.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                  const pass = member.allocatedPassword || member.password || 'password123';
                  const isPassRevealed = revealedPasswords[member.id];

                  return (
                    <div 
                      key={member.id} 
                      className={`border rounded-2xl p-4 transition-all ${
                        isSuper 
                          ? 'bg-amber-950/10 border-amber-500/30' 
                          : isAdmin 
                            ? 'bg-indigo-950/10 border-indigo-500/30' 
                            : isCoAdmin 
                              ? 'bg-teal-950/10 border-teal-500/30' 
                              : 'bg-white/[0.03] border-white/10'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Member identity */}
                        <div className="flex items-center gap-3">
                          <img 
                            src={member.avatar} 
                            alt={member.name} 
                            className="w-11 h-11 rounded-2xl object-cover border border-white/10 shrink-0" 
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">{member.name}</span>
                              {isSuper && (
                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                  <Crown className="w-3 h-3 text-amber-400" /> Super Admin
                                </span>
                              )}
                              {isAdmin && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-mono">
                                  Admin
                                </span>
                              )}
                              {isCoAdmin && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono">
                                  Co-Admin
                                </span>
                              )}
                              {!isSuper && !isAdmin && !isCoAdmin && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 font-mono">
                                  Member
                                </span>
                              )}
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                                {member.membershipType === 'both' ? 'Rent + Mess' : member.membershipType === 'rent_only' ? 'Rent Only' : 'Mess Only'}
                              </span>
                            </div>

                            {/* Credentials display row */}
                            <div className="flex items-center gap-2 mt-1 text-xs font-mono flex-wrap">
                              <span className="text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-white/5">
                                @{uName}
                              </span>
                              <span className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
                                Pass: <strong className="text-amber-300">{isPassRevealed ? pass : '••••••'}</strong>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordReveal(member.id)}
                                  className="text-slate-500 hover:text-slate-300 ml-0.5"
                                >
                                  {isPassRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleShareCredentialsWhatsApp(member)}
                                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-sans"
                                title="Share via WhatsApp"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </button>
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1 font-mono">
                              <span>{member.email}</span>
                              {member.upiId && <span className="text-slate-500">• UPI: {member.upiId}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Actions & Role Selector Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          
                          {/* Switch Active Member Shortcut */}
                          {isActorAdmin && onSelectActiveMember && !isCurrentActive && (
                            <button
                              onClick={() => onSelectActiveMember(member.id)}
                              className="px-2.5 py-1 text-xs rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-medium cursor-pointer"
                              title="Switch active session to this member"
                            >
                              Act as User
                            </button>
                          )}

                          {/* Role Selector Buttons */}
                          <button
                            onClick={() => handleRoleChange(member, 'admin')}
                            disabled={!isActorAdmin || isSuper}
                            className={`px-2.5 py-1 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                              isAdmin
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white/5 text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-300 hover:border-indigo-500/30 border border-white/10'
                            } ${!isActorAdmin || isSuper ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Admin
                          </button>

                          <button
                            onClick={() => handleRoleChange(member, 'co_admin')}
                            disabled={!isActorAdmin || isSuper}
                            className={`px-2.5 py-1 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                              isCoAdmin
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-white/5 text-slate-300 hover:bg-teal-600/20 hover:text-teal-300 hover:border-teal-500/30 border border-white/10'
                            } ${!isActorAdmin || isSuper ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Co-Admin
                          </button>

                          <button
                            onClick={() => handleRoleChange(member, 'member')}
                            disabled={!isActorAdmin || isSuper}
                            className={`px-2.5 py-1 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                              !isAdmin && !isCoAdmin && !isSuper
                                ? 'bg-slate-700 text-white shadow-sm'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                            } ${!isActorAdmin || isSuper ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Member
                          </button>

                          {/* Granular Permissions Toggle */}
                          <button
                            onClick={() => setSelectedMemberForCustom(selectedMemberForCustom === member.id ? null : member.id)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                            title="Fine-tune permissions"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Remove member button */}
                          {isActorAdmin && !isSuper && (
                            <button
                              onClick={() => handleRemoveMemberClick(member)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer"
                              title="Remove roommate"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>

                      </div>

                      {/* Granular Permissions Drawer */}
                      {selectedMemberForCustom === member.id && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-in fade-in">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Fine-Grained Permissions for {member.name}:
                          </span>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.keys(DEFAULT_PERMISSIONS.member).map((key) => {
                              const permKey = key as keyof MemberPermissions;
                              const isGranted = !!member.permissions?.[permKey];
                              const permLabels: Record<string, string> = {
                                canAddExpense: 'Add Expenses',
                                canEditAnyExpense: 'Edit Any Expense',
                                canDeleteAnyExpense: 'Delete Expenses',
                                canManageMess: 'Manage Mess & Rates',
                                canManageCleaningRota: 'Manage Cleaning Rota',
                                canManageMembers: 'Manage Roommates',
                                canEditRoomSettings: 'Edit Room Settings',
                                canViewAuditLogs: 'View Audit Logs',
                                canGrantAdmin: 'Grant Admin Privileges',
                              };

                              return (
                                <button
                                  key={permKey}
                                  type="button"
                                  onClick={() => handleTogglePermission(member, permKey)}
                                  disabled={isSuper}
                                  className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                                    isGranted
                                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                                      : 'bg-white/[0.02] border-white/5 text-slate-500'
                                  } ${isSuper ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <span className="truncate pr-1">{permLabels[permKey] || permKey}</span>
                                  {isGranted ? <Check className="w-3 h-3 text-indigo-400 shrink-0" /> : <X className="w-3 h-3 text-slate-600 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: ADD ROOMMATE WITH ALLOCATED CREDENTIALS */}
          {activeTab === 'add_member' && (
            <form onSubmit={handleCreateMember} className="space-y-4 max-w-lg">
              
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  Allocate Credentials for New Roommate
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Lee"
                    value={newName}
                    onChange={(e) => handleNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
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
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
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
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="jordan@roomex.app"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Initial Advance Deposit</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newDeposit}
                    onChange={(e) => setNewDeposit(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Initial Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as Role)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="member">Regular Member (Standard Split & Mess)</option>
                      <option value="co_admin">Co-Admin (Can manage meals & add expenses)</option>
                      <option value="admin">Room Admin (Full expense & delegation control)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Membership Plan</label>
                    <select
                      value={newMembershipType}
                      onChange={(e) => setNewMembershipType(e.target.value as MembershipType)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="both">Both (Room Rent + Mess Meals)</option>
                      <option value="rent_only">Rent Only (No mess bills)</option>
                      <option value="mess_only">Mess Only (No rent shares)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('delegation')}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Allocate & Add Roommate</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'audit_log' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Administrative Activity Trail
              </h3>
              
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No delegation events recorded yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {auditLogs.slice().reverse().map((log) => (
                    <div key={log.id} className="p-3 bg-white/[0.03] border border-white/10 rounded-xl flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{log.action.replace('_', ' ')}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-0.5">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap font-mono">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 flex justify-end bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
