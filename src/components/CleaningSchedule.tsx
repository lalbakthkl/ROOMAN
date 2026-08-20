import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  SkipForward, 
  Calendar, 
  History, 
  Share2, 
  Users, 
  Award, 
  Flame, 
  ChevronRight, 
  AlertCircle, 
  MessageSquare, 
  X, 
  Clock, 
  Check, 
  Copy,
  RotateCcw,
  Palmtree
} from 'lucide-react';
import { 
  CleaningSchedule as CleaningScheduleType, 
  CleaningHistoryEntry, 
  Member, 
  RoomSettings 
} from '../types';

interface CleaningScheduleProps {
  schedule: CleaningScheduleType;
  history: CleaningHistoryEntry[];
  members: Member[];
  activeMember: Member;
  settings: RoomSettings;
  onUpdateSchedule: (newSchedule: CleaningScheduleType, newHistoryEntry: CleaningHistoryEntry) => void;
}

export const CleaningSchedule: React.FC<CleaningScheduleProps> = ({
  schedule,
  history,
  members,
  activeMember,
  settings,
  onUpdateSchedule,
}) => {
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [notes, setNotes] = useState('');
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [recentCompletedMember, setRecentCompletedMember] = useState<Member | null>(null);
  const [recentDutyArea, setRecentDutyArea] = useState<string>('');
  const [copiedBadge, setCopiedBadge] = useState(false);
  
  // Admin Duty Assignment State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDutyArea, setSelectedDutyArea] = useState(schedule.dutyArea || 'Bathroom & Washroom');
  const [customDutyText, setCustomDutyText] = useState('');
  const [assignedDutiesMap, setAssignedDutiesMap] = useState<Record<string, string>>(
    schedule.assignedDuties || {
      [members[0]?.id || '']: 'Bathroom & Washroom',
      [members[1]?.id || '']: 'Full Flat / Apartment',
      [members[2]?.id || '']: 'Kitchen & Sink',
      [members[3]?.id || '']: 'Living Room & Trash Mopping',
    }
  );

  // Interval / Frequency configuration state
  const [intervalFrequency, setIntervalFrequency] = useState<CleaningScheduleType['frequency']>(schedule.frequency || 'weekly');
  const [customIntervalDays, setCustomIntervalDays] = useState<number>(schedule.intervalDays || 7);
  const [intervalSavedToast, setIntervalSavedToast] = useState(false);

  const isAdmin = 
    activeMember.role === 'super_admin' || 
    activeMember.role === 'admin' || 
    activeMember.permissions?.canManageCleaningSchedule;

  const DUTY_PRESETS = [
    { label: '🚿 Bathroom & Washroom', value: 'Bathroom & Washroom', desc: 'Sanitize toilet, mirrors, sink, tiles & shower area' },
    { label: '🏠 Full Flat / Apartment', value: 'Full Flat / Apartment', desc: 'Sweeping, vacuuming, mopping all common areas & hallway' },
    { label: '🍳 Kitchen & Sink', value: 'Kitchen & Sink', desc: 'Wipe countertops, stove, sink disposal & dish rack' },
    { label: '🛋️ Living Room & Balcony', value: 'Living Room & Balcony', desc: 'Dust sofa, sweep balcony, arrange shoe rack' },
    { label: '🗑️ Trash Disposal & Mopping', value: 'Trash Disposal & Mopping', desc: 'Empty dustbins, replace trash bags, wet mop floor' },
    { label: '🍽️ Utensils & Dining Area', value: 'Utensils & Dining Area', desc: 'Wipe dining table, arrange shared kitchenware' },
  ];

  const memberMap = new Map<string, Member>(members.map(m => [m.id, m]));
  
  // Current member on duty
  const currentMember = memberMap.get(schedule.currentMemberId) || members[0];
  const nextMember = memberMap.get(schedule.nextMemberId) || members[1] || members[0];

  const currentDutyArea = schedule.assignedDuties?.[currentMember.id] || schedule.dutyArea || 'Bathroom & Washroom';
  const nextDutyArea = schedule.assignedDuties?.[nextMember.id] || 'Full Flat / Apartment';

  // Advance rota order (smartly skipping members on vacation or with cleaning paused)
  const getActiveRota = (): string[] => {
    const rawRota = schedule.rotaOrder.length > 0 ? schedule.rotaOrder : members.map(m => m.id);
    const active = rawRota.filter(id => {
      const m = memberMap.get(id);
      return m && !m.isOnVacation && m.isCleaningActive !== false;
    });
    return active.length > 0 ? active : rawRota;
  };

  const getNextInRota = (currentId: string): string => {
    const rota = getActiveRota();
    const currentIndex = rota.indexOf(currentId);
    if (currentIndex === -1 || currentIndex === rota.length - 1) {
      return rota[0];
    }
    return rota[currentIndex + 1];
  };

  const getSubsequentInRota = (nextId: string): string => {
    const rota = getActiveRota();
    const nextIndex = rota.indexOf(nextId);
    if (nextIndex === -1 || nextIndex === rota.length - 1) {
      return rota[0];
    }
    return rota[nextIndex + 1];
  };

  const handleCompleteDuty = () => {
    const dutyMember = currentMember;
    const completedDuty = currentDutyArea;
    const newCurrent = schedule.nextMemberId;
    const newNext = getSubsequentInRota(newCurrent);

    const historyEntry: CleaningHistoryEntry = {
      id: `clean_${Date.now()}`,
      roomId: settings.id,
      memberId: dutyMember.id,
      memberName: dutyMember.name,
      action: 'completed',
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      dutyArea: completedDuty,
      notes: notes.trim() || `${completedDuty} cleaning completed`,
    };

    const newSchedule: CleaningScheduleType = {
      ...schedule,
      currentMemberId: newCurrent,
      nextMemberId: newNext,
      dutyDate: new Date().toISOString().split('T')[0],
      dutyArea: schedule.assignedDuties?.[newCurrent] || 'Full Flat / Apartment',
      lastCompletedDate: new Date().toISOString().split('T')[0],
      lastCompletedBy: dutyMember.id,
    };

    onUpdateSchedule(newSchedule, historyEntry);
    setRecentCompletedMember(dutyMember);
    setRecentDutyArea(completedDuty);
    setBadgeModalOpen(true);
    setNotes('');
  };

  const handleSkipDuty = (e: React.FormEvent) => {
    e.preventDefault();
    const dutyMember = currentMember;
    const skippedDuty = currentDutyArea;
    const newCurrent = schedule.nextMemberId;
    const newNext = getSubsequentInRota(newCurrent);

    const historyEntry: CleaningHistoryEntry = {
      id: `clean_${Date.now()}`,
      roomId: settings.id,
      memberId: dutyMember.id,
      memberName: dutyMember.name,
      action: 'skipped',
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      dutyArea: skippedDuty,
      skipReason: skipReason.trim() || 'Unavailable / Requested turn pass',
    };

    const newSchedule: CleaningScheduleType = {
      ...schedule,
      currentMemberId: newCurrent,
      nextMemberId: newNext,
      dutyDate: new Date().toISOString().split('T')[0],
      dutyArea: schedule.assignedDuties?.[newCurrent] || 'Full Flat / Apartment',
    };

    onUpdateSchedule(newSchedule, historyEntry);
    setSkipModalOpen(false);
    setSkipReason('');
  };

  // Save Admin Duty Assignments & Cleaning Interval
  const handleSaveDutyAssignments = () => {
    const finalActiveDuty = customDutyText.trim() || selectedDutyArea;
    const updatedDuties = {
      ...assignedDutiesMap,
      [schedule.currentMemberId]: finalActiveDuty,
    };

    const intervalDaysCalculated = 
      intervalFrequency === 'daily' ? 1 :
      intervalFrequency === 'weekly' ? 7 :
      intervalFrequency === 'bi_weekly' ? 14 :
      intervalFrequency === 'monthly' ? 30 :
      Math.max(1, customIntervalDays);

    const newSchedule: CleaningScheduleType = {
      ...schedule,
      dutyArea: finalActiveDuty,
      assignedDuties: updatedDuties,
      frequency: intervalFrequency,
      intervalDays: intervalDaysCalculated,
    };

    const historyEntry: CleaningHistoryEntry = {
      id: `duty_assign_${Date.now()}`,
      roomId: settings.id,
      memberId: activeMember.id,
      memberName: activeMember.name,
      action: 'completed',
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      dutyArea: finalActiveDuty,
      notes: `Admin assigned cleaning duty: "${finalActiveDuty}" and set rotation interval to ${intervalFrequency} (${intervalDaysCalculated} days)`,
    };

    onUpdateSchedule(newSchedule, historyEntry);
    setAssignModalOpen(false);
    setIntervalSavedToast(true);
    setTimeout(() => setIntervalSavedToast(false), 3000);
  };

  const handleQuickChangeInterval = (freq: CleaningScheduleType['frequency'], days?: number) => {
    if (!isAdmin) return;
    const intervalDaysCalculated = 
      freq === 'daily' ? 1 :
      freq === 'weekly' ? 7 :
      freq === 'bi_weekly' ? 14 :
      freq === 'monthly' ? 30 :
      Math.max(1, days || customIntervalDays || 3);

    setIntervalFrequency(freq);
    if (days) setCustomIntervalDays(days);

    const newSchedule: CleaningScheduleType = {
      ...schedule,
      frequency: freq,
      intervalDays: intervalDaysCalculated,
    };

    const historyEntry: CleaningHistoryEntry = {
      id: `interval_change_${Date.now()}`,
      roomId: settings.id,
      memberId: activeMember.id,
      memberName: activeMember.name,
      action: 'completed',
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      dutyArea: currentDutyArea,
      notes: `Admin updated cleaning interval to ${freq.replace('_', ' ')} (${intervalDaysCalculated} days)`,
    };

    onUpdateSchedule(newSchedule, historyEntry);
    setIntervalSavedToast(true);
    setTimeout(() => setIntervalSavedToast(false), 3000);
  };

  // WhatsApp Badge Share Text
  const generateBadgeText = (completedBy: Member, dutyName: string) => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return `🏆 *ROOMEX CLEANLINESS CHAMPION BADGE* 🏆\n\n✨ *Duty Completed By:* ${completedBy.name}\n🏠 *Room:* ${settings.name} (${settings.roomCode})\n🧹 *Assigned Duty Area:* ${dutyName}\n📅 *Date:* ${today}\n\n🧼 *Status:* Sparkling clean, sanitized, and inspected!\n👉 *Next on Duty:* ${nextMember.name} (${nextDutyArea})\n\nKeep our flat shining! ⭐\n_Generated via ROOMEX Mess & Room Management App_\n_App developed by sakeerputhan_`;
  };

  const handleShareBadgeWhatsApp = (completedBy: Member) => {
    const text = generateBadgeText(completedBy, recentDutyArea || currentDutyArea);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyBadgeText = (completedBy: Member) => {
    const text = generateBadgeText(completedBy, recentDutyArea || currentDutyArea);
    navigator.clipboard.writeText(text);
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Current Cleaning Turn Banner */}
      <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-emerald-950/40 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header pill */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Active Cleaning Duty
                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ON DUTY TODAY
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Daily & weekly room sanitation schedule
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {isAdmin && (
                <div className="flex items-center gap-1.5 bg-slate-950/90 border border-white/10 p-1 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-1 font-mono">Interval:</span>
                  {(['daily', 'weekly', 'bi_weekly', 'monthly'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => handleQuickChangeInterval(f)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        schedule.frequency === f
                          ? 'bg-emerald-500 text-slate-950 font-black shadow'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {f === 'bi_weekly' ? '2-Wks' : f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDutyArea(currentDutyArea);
                    setIntervalFrequency(schedule.frequency || 'weekly');
                    setCustomIntervalDays(schedule.intervalDays || 7);
                    setAssignModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition-all shadow cursor-pointer"
                  title="Assign specific cleaning duties & configure rotation intervals"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Configure Rota & Intervals (Admin)</span>
                </button>
              )}

              <div className="text-right pl-1">
                <span className="text-[10px] text-slate-400 font-mono block">Frequency</span>
                <span className="text-xs font-bold text-emerald-300 capitalize font-mono">
                  {schedule.frequency ? schedule.frequency.replace('_', ' ') : 'Weekly'} ({schedule.intervalDays || 7}d)
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Roommate Spotlight Card */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <img 
                  src={currentMember.avatar} 
                  alt={currentMember.name} 
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 rounded-full p-1 shadow">
                  <Sparkles className="w-3 h-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-white">{currentMember.name}</h4>
                  {currentMember.id === activeMember.id && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-sm">
                      YOUR TURN
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Assigned: {currentDutyArea}</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-1.5 block">
                  Next in line: <strong className="text-slate-300">{nextMember.name}</strong> ({nextDutyArea})
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => setSkipModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all active:scale-95"
                title="Skip if member is traveling or busy"
              >
                <SkipForward className="w-4 h-4 text-amber-400" />
                <span>Skip Turn</span>
              </button>

              <button
                onClick={handleCompleteDuty}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish & Share Badge</span>
              </button>
            </div>
          </div>

          {/* Rota Queue Chain */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Upcoming Cleaning Turn Sequence & Assigned Duties:
            </span>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {(schedule.rotaOrder.length > 0 ? schedule.rotaOrder : members.map(m => m.id)).map((mId, index) => {
                const m = memberMap.get(mId);
                const isCurrent = mId === schedule.currentMemberId;
                const isNext = mId === schedule.nextMemberId;
                const memberDuty = schedule.assignedDuties?.[mId] || (isCurrent ? currentDutyArea : isNext ? nextDutyArea : 'Flat Cleaning');

                const isOnVacation = m?.isOnVacation || m?.isCleaningActive === false;

                return (
                  <React.Fragment key={mId}>
                    <div 
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border whitespace-nowrap text-xs transition-all shrink-0 ${
                        isCurrent 
                          ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold ring-2 ring-emerald-400/40 shadow-md' 
                          : isNext
                          ? 'bg-indigo-500/20 border-indigo-500 text-slate-200 font-medium'
                          : isOnVacation
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-300 opacity-75'
                          : 'bg-slate-950/60 border-white/10 text-slate-400'
                      }`}
                    >
                      <img 
                        src={m?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'} 
                        alt={m?.name} 
                        className="w-5 h-5 rounded-full object-cover" 
                      />
                      <div className="text-left">
                        <div className="flex items-center gap-1">
                          <span>{m?.name || 'Roommate'}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-black">
                              NOW
                            </span>
                          )}
                          {isNext && (
                            <span className="text-[9px] bg-indigo-500 text-white px-1 py-0.2 rounded font-bold">
                              NEXT
                            </span>
                          )}
                          {isOnVacation && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono flex items-center gap-0.5">
                              <Palmtree className="w-2.5 h-2.5" /> AWAY
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {isOnVacation ? 'Duty Paused' : memberDuty}
                        </div>
                      </div>
                    </div>
                    {index < (schedule.rotaOrder.length || members.length) - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Cleaning History Timeline */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Cleaning History & Badges
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
            {history.length} records
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No cleaning records logged yet. Mark your first duty above!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {history.map((record) => {
              const isCompleted = record.action === 'completed';
              const member = memberMap.get(record.memberId);

              return (
                <div key={record.id} className="py-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                      isCompleted 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <SkipForward className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{record.memberName}</span>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                          isCompleted 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {isCompleted ? 'Cleaned & Sanitized' : 'Turn Skipped'}
                        </span>
                      </div>

                      {record.notes && (
                        <p className="text-[11px] text-slate-300">
                          {record.notes}
                        </p>
                      )}

                      {record.skipReason && (
                        <p className="text-[11px] text-amber-300/80 italic">
                          Reason: {record.skipReason}
                        </p>
                      )}

                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(record.timestamp).toLocaleString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Share badge on WhatsApp for completed turns */}
                  {isCompleted && member && (
                    <button
                      onClick={() => handleShareBadgeWhatsApp(member)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                      title="Share WhatsApp Badge"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp Badge</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Skip Duty Reason Modal */}
      {skipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-400">
                <SkipForward className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Skip Cleaning Duty</h3>
              </div>
              <button 
                onClick={() => setSkipModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Cannot do cleaning duty today? The schedule will pass to <strong className="text-white">{nextMember.name}</strong> and record in history.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reason for Skip (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Traveling home for weekend, sick today"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSkipModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSkipDuty}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition-all"
              >
                Pass to Next Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebratory WhatsApp Cleanliness Champion Badge Modal */}
      {badgeModalOpen && recentCompletedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
            
            {/* Modal Header Badge */}
            <div className="p-6 bg-gradient-to-b from-emerald-600/30 via-slate-900 to-slate-900 text-center space-y-2 border-b border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 text-2xl font-black">
                🏆
              </div>
              <h3 className="text-lg font-extrabold text-white">Cleanliness Champion!</h3>
              <p className="text-xs text-emerald-300 font-medium">
                Duty verified & completed by <strong>{recentCompletedMember.name}</strong>
              </p>
            </div>

            {/* Formatted Badge Text Preview */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">
                {generateBadgeText(recentCompletedMember, recentDutyArea || currentDutyArea)}
              </div>

              {/* Share & Copy Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => handleShareBadgeWhatsApp(recentCompletedMember)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyBadgeText(recentCompletedMember)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 transition-all"
                >
                  {copiedBadge ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedBadge ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Footer Dismiss */}
            <div className="px-5 py-3 border-t border-white/10 bg-slate-950/60 text-center">
              <button
                type="button"
                onClick={() => setBadgeModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white font-medium"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin Duty Assignment Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5 text-amber-400">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Assign Cleaning Duties (Admin)</h3>
                  <p className="text-xs text-slate-400 font-mono">Specify duties for today and per roommate</p>
                </div>
              </div>
              <button 
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Duty Preset Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                1. Select Duty for Currently Active Turn ({currentMember.name}):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DUTY_PRESETS.map((preset) => {
                  const isSelected = selectedDutyArea === preset.value && !customDutyText;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setSelectedDutyArea(preset.value);
                        setCustomDutyText('');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow-md ring-1 ring-amber-400/40'
                          : 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs font-bold">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Duty Area Input */}
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Or enter custom duty (e.g. Balcony & Shoe Rack)"
                  value={customDutyText}
                  onChange={(e) => setCustomDutyText(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Per-Roommate Duty Rota Mapping */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="block text-xs font-semibold text-slate-200">
                2. Customize Assigned Duties for Each Roommate:
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-950/70 border border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      <span className="text-xs font-medium text-white truncate">{m.name}</span>
                    </div>
                    <select
                      value={assignedDutiesMap[m.id] || 'Bathroom & Washroom'}
                      onChange={(e) => {
                        setAssignedDutiesMap(prev => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }));
                      }}
                      className="bg-slate-900 border border-white/15 text-xs text-amber-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 max-w-[190px]"
                    >
                      {DUTY_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.value}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Configure Rotation Interval */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="block text-xs font-semibold text-slate-200">
                3. Rotation Interval & Frequency (Admin):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { key: 'daily', label: 'Daily (1d)' },
                  { key: 'weekly', label: 'Weekly (7d)' },
                  { key: 'bi_weekly', label: 'Bi-Weekly (14d)' },
                  { key: 'monthly', label: 'Monthly (30d)' },
                  { key: 'custom_days', label: 'Custom Days' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIntervalFrequency(item.key as any)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      intervalFrequency === item.key
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {intervalFrequency === 'custom_days' && (
                <div className="flex items-center gap-2 pt-1 bg-slate-950/60 p-2.5 rounded-xl border border-white/10">
                  <span className="text-xs text-slate-300">Rotate cleaning turn every:</span>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={customIntervalDays}
                    onChange={(e) => setCustomIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-bold focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-mono">days</span>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDutyAssignments}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                Apply & Save Duties
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
