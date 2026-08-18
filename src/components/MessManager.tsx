import React, { useState } from 'react';
import { 
  Utensils, 
  Calendar, 
  Plus, 
  Check, 
  X, 
  Coffee, 
  Sun, 
  Moon, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Sparkles,
  Wallet,
  AlertCircle,
  Calculator,
  Info,
  ShieldCheck,
  Lock,
  Edit2,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Save,
  Home,
  Palmtree,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { 
  Member, 
  DailyMealEntry, 
  Expense, 
  RoomSettings,
  MembershipType 
} from '../types';
import { calculateMessMetrics, calculateMemberMeals } from '../lib/storage';

interface MessManagerProps {
  meals: DailyMealEntry[];
  members: Member[];
  expenses: Expense[];
  settings: RoomSettings;
  activeMember: Member;
  onUpdateDailyMeal: (entry: DailyMealEntry) => void;
  onOpenAddExpense: () => void;
  onUpdateDepositBalance: (memberId: string, deltaAmount: number) => void;
  onUpdateMemberDaysStayed?: (memberId: string, days: number) => void;
  onUpdateMemberMembershipType?: (memberId: string, type: MembershipType) => void;
  onUpdateDaysInMonth?: (days: number) => void;
  onUpdateSettings?: (settings: RoomSettings) => void;
}

export const MessManager: React.FC<MessManagerProps> = ({
  meals,
  members,
  expenses,
  settings,
  activeMember,
  onUpdateDailyMeal,
  onOpenAddExpense,
  onUpdateDepositBalance,
  onUpdateMemberDaysStayed,
  onUpdateMemberMembershipType,
  onUpdateDaysInMonth,
  onUpdateSettings,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [depositModalMember, setDepositModalMember] = useState<Member | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [messViewMode, setMessViewMode] = useState<'days_stayed' | 'daily_attendance'>('days_stayed');
  const [adminNoticeModal, setAdminNoticeModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Admin permission check (Super Admin & Admin can adjust days, membership types, and change room settings)
  const isAdmin = activeMember.role === 'super_admin' || activeMember.role === 'admin' || activeMember.permissions.canManageMeals || activeMember.permissions.canEditRoomSettings;

  // Days in month setting (default 30)
  const daysInMonth = settings.daysInMonth || 30;

  // Local state for quick settings
  const [editDaysInMonth, setEditDaysInMonth] = useState(daysInMonth.toString());
  const [editRoomRent, setEditRoomRent] = useState((settings.monthlyRent || 0).toString());
  const [editCurrency, setEditCurrency] = useState(settings.currencySymbol || '₹');
  const [editRoomName, setEditRoomName] = useState(settings.name || 'Skyline Flat 402');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Find or initialize daily meal entry for selectedDate
  const currentEntry: DailyMealEntry = meals.find(m => m.date === selectedDate) || {
    id: `meal_${selectedDate.replace(/-/g, '_')}`,
    roomId: settings.id,
    date: selectedDate,
    breakfastCount: Object.fromEntries(members.map(m => [m.id, 1])),
    lunchCount: Object.fromEntries(members.map(m => [m.id, 1])),
    dinnerCount: Object.fromEntries(members.map(m => [m.id, 1])),
    guestMeals: Object.fromEntries(members.map(m => [m.id, 0])),
  };

  const metrics = calculateMessMetrics(expenses, meals, members, daysInMonth);

  // Total Rent Calculations
  const rentExpenses = expenses.filter(e => e.category === 'rent');
  const totalRentExpense = rentExpenses.reduce((sum, e) => sum + e.amount, 0) || (settings.monthlyRent || 0);

  // Calculate per member rent share
  const rentMembers = members.filter(m => m.membershipType !== 'mess_only');
  const rentSharePerMember = rentMembers.length > 0 ? (totalRentExpense / rentMembers.length) : 0;

  const handleToggleMeal = (memberId: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const key = `${mealType}Count` as 'breakfastCount' | 'lunchCount' | 'dinnerCount';
    const currentVal = currentEntry[key][memberId] || 0;
    const newVal = currentVal > 0 ? 0 : 1;

    const updatedEntry: DailyMealEntry = {
      ...currentEntry,
      [key]: {
        ...currentEntry[key],
        [memberId]: newVal,
      },
    };

    onUpdateDailyMeal(updatedEntry);
  };

  const handleUpdateGuestMeal = (memberId: string, delta: number) => {
    const currentVal = currentEntry.guestMeals[memberId] || 0;
    const newVal = Math.max(0, currentVal + delta);

    const updatedEntry: DailyMealEntry = {
      ...currentEntry,
      guestMeals: {
        ...currentEntry.guestMeals,
        [memberId]: newVal,
      },
    };

    onUpdateDailyMeal(updatedEntry);
  };

  const handleBulkSet = (allOn: boolean) => {
    const val = allOn ? 1 : 0;
    const updatedEntry: DailyMealEntry = {
      ...currentEntry,
      breakfastCount: Object.fromEntries(members.map(m => [m.id, val])),
      lunchCount: Object.fromEntries(members.map(m => [m.id, val])),
      dinnerCount: Object.fromEntries(members.map(m => [m.id, val])),
    };
    onUpdateDailyMeal(updatedEntry);
  };

  const handleSaveDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalMember) return;
    const amt = parseFloat(depositAmount);
    if (!isNaN(amt) && amt !== 0) {
      onUpdateDepositBalance(depositModalMember.id, amt);
    }
    setDepositModalMember(null);
    setDepositAmount('');
  };

  // Day Adjustment Handler (Admin & Super Admin)
  const handleDaysChange = (memberId: string, delta: number) => {
    if (!isAdmin) {
      setAdminNoticeModal(true);
      return;
    }
    if (!onUpdateMemberDaysStayed) return;
    const currentDays = metrics.memberDaysBreakdown[memberId]?.daysStayed !== undefined 
      ? metrics.memberDaysBreakdown[memberId].daysStayed 
      : daysInMonth;
    const newDays = Math.max(0, Math.min(daysInMonth, currentDays + delta));
    onUpdateMemberDaysStayed(memberId, newDays);
  };

  const handleDirectDaysInput = (memberId: string, valueStr: string) => {
    if (!isAdmin) {
      setAdminNoticeModal(true);
      return;
    }
    if (!onUpdateMemberDaysStayed) return;
    const parsed = parseInt(valueStr, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(daysInMonth, parsed));
      onUpdateMemberDaysStayed(memberId, clamped);
    }
  };

  const handleSetAllMembersDays = (targetDays: number) => {
    if (!isAdmin) {
      setAdminNoticeModal(true);
      return;
    }
    if (onUpdateMemberDaysStayed) {
      members.forEach(m => {
        if (!m.isOnVacation) {
          onUpdateMemberDaysStayed(m.id, targetDays);
        }
      });
    }
  };

  const handleMembershipTypeSelect = (memberId: string, type: MembershipType) => {
    if (!isAdmin) {
      setAdminNoticeModal(true);
      return;
    }
    if (onUpdateMemberMembershipType) {
      onUpdateMemberMembershipType(memberId, type);
    }
  };

  const handleSaveAdminSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setAdminNoticeModal(true);
      return;
    }

    const parsedDays = parseInt(editDaysInMonth, 10) || 30;
    const parsedRent = parseFloat(editRoomRent) || 0;

    if (onUpdateDaysInMonth) {
      onUpdateDaysInMonth(parsedDays);
    }

    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        name: editRoomName.trim() || settings.name,
        daysInMonth: parsedDays,
        monthlyRent: parsedRent,
        currencySymbol: editCurrency.trim() || '₹',
      });
    }

    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Metrics Cards: Total Purchase, Total Stayed Days, Daily Rate, Total Payable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Mess Purchase */}
        <div className="p-5 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-indigo-300 font-bold mb-1">
            <span>TOTAL MESS PURCHASE</span>
            <Utensils className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {settings.currencySymbol}{metrics.totalMessExpense.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Mess / Grocery pool</span>
            <button 
              onClick={onOpenAddExpense} 
              className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
            >
              + Add Bill
            </button>
          </div>
        </div>

        {/* Total Stayed Days Across All Roommates */}
        <div className="p-5 bg-slate-900 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
            <span>TOTAL STAYED DAYS</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics.totalMemberStayedDays} <span className="text-xs font-normal text-slate-400">member-days</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Sum across all active mess roommates
          </div>
        </div>

        {/* Daily Mess Rate: Total Purchase ÷ Total Stayed Days */}
        <div className="p-5 bg-slate-900 border border-white/10 rounded-2xl relative overflow-hidden space-y-1">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
            <span>PER DAY COST RATE</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300 font-mono">
            {settings.currencySymbol}{metrics.dailyMessRate.toFixed(2)}
            <span className="text-xs font-normal text-slate-400"> / day</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {settings.currencySymbol}{metrics.totalMessExpense.toFixed(2)} ÷ {metrics.totalMemberStayedDays} Stayed Days
          </div>
        </div>

        {/* Active Member's Total Payable: Rent Share + Mess Bill */}
        {(() => {
          const myMessBill = activeMember.membershipType === 'rent_only' ? 0 : (metrics.memberDaysBreakdown[activeMember.id]?.cost || 0);
          const myRentShare = activeMember.membershipType === 'mess_only' ? 0 : rentSharePerMember;
          const myTotalPayable = myMessBill + myRentShare;

          return (
            <div className="p-5 bg-gradient-to-br from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/40 rounded-2xl space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-amber-300 font-bold mb-1">
                <span>MY PAYABLE AMOUNT</span>
                <Wallet className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {settings.currencySymbol}{myTotalPayable.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Rent ({settings.currencySymbol}{myRentShare.toFixed(0)}) + Mess ({settings.currencySymbol}{myMessBill.toFixed(0)})
              </div>
            </div>
          );
        })()}

      </div>

      {/* ADMIN QUICK SETTINGS & ROOM RENT CONFIGURATION DRAWER (Requirement 4) */}
      {isAdmin && (
        <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-xl transition-all">
          <div 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-4 bg-slate-950/70 hover:bg-slate-950 flex items-center justify-between cursor-pointer border-b border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Mess & Rent Admin Settings</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Admin Controls
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Change Month Days, Total Monthly Rent, Currency, and Quick Bulk Actions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-400 font-semibold hidden sm:inline">
                {isSettingsOpen ? 'Hide Settings' : 'Edit Rent & Days'}
              </span>
              <button 
                type="button"
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                {isSettingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSettingsOpen && (
            <form onSubmit={handleSaveAdminSettings} className="p-5 space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Days in Month */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Days in Current Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editDaysInMonth}
                    onChange={(e) => setEditDaysInMonth(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="30"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Used for daily rate & stay calculation</span>
                </div>

                {/* Total Monthly Room Rent */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-amber-400" />
                    Total Monthly Flat Rent ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editRoomRent}
                    onChange={(e) => setEditRoomRent(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="12000"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Split among {rentMembers.length} rent roommates</span>
                </div>

                {/* Currency Symbol */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="₹ or $ or AED"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Displayed on bills & settlement receipts</span>
                </div>

                {/* Room / Flat Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    Flat / Room Name
                  </label>
                  <input
                    type="text"
                    value={editRoomName}
                    onChange={(e) => setEditRoomName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Skyline Flat 402"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Room code: {settings.roomCode}</span>
                </div>

              </div>

              {/* Quick Bulk Action Helpers for Days */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 font-semibold">Bulk Set Days:</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllMembersDays(parseInt(editDaysInMonth, 10) || 30)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-medium cursor-pointer"
                  >
                    All Full Month ({editDaysInMonth}d)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllMembersDays(15)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-medium cursor-pointer"
                  >
                    All 15 Days
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {settingsSavedToast && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Settings Saved!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Settings</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Primary Section: Mess Bill Calculation & Roommate Columns */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Roommate Mess & Rent Calculation
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              <strong className="text-amber-300">Rule #3 Formula:</strong> Payable Amount = <strong className="text-white">Rent Share + Mess Bill</strong>
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-950 border border-white/10 rounded-xl text-xs font-medium self-start sm:self-auto">
            <button
              onClick={() => setMessViewMode('days_stayed')}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                messViewMode === 'days_stayed'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Days Stayed Formula
            </button>
            <button
              onClick={() => setMessViewMode('daily_attendance')}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                messViewMode === 'daily_attendance'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Daily Meal Log
            </button>
          </div>
        </div>

        {/* Days Stayed View */}
        {messViewMode === 'days_stayed' ? (
          <div className="space-y-4">
            
            {/* Live Formula Banner */}
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-200">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong>Per Day Mess Rate:</strong> ({settings.currencySymbol}{metrics.totalMessExpense.toFixed(2)} ÷ {metrics.totalMemberStayedDays} Stayed Days) = <strong>{settings.currencySymbol}{metrics.dailyMessRate.toFixed(2)}/day</strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {isAdmin ? 'Admin Days Adjuster Enabled' : 'Admin Controlled'}
              </div>
            </div>

            {/* Roommates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((member) => {
                const memType = member.membershipType || (member.isMessActive ? 'both' : 'rent_only');
                const isRentOnly = memType === 'rent_only';
                const isMessOnly = memType === 'mess_only';
                const isOnVacation = !!member.isOnVacation;

                const dayInfo = metrics.memberDaysBreakdown[member.id] || {
                  daysStayed: member.daysStayedInMonth ?? daysInMonth,
                  cost: 0,
                  formula: '',
                };

                const calculatedMessBill = isRentOnly ? 0 : dayInfo.cost;
                const calculatedRentShare = isMessOnly ? 0 : rentSharePerMember;
                const totalPayable = calculatedRentShare + calculatedMessBill;

                return (
                  <div 
                    key={member.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                      member.id === activeMember.id
                        ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md'
                        : 'bg-slate-950/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Member Header & Total Payable Breakdown */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={member.avatar} 
                          alt={member.name} 
                          className="w-11 h-11 rounded-2xl object-cover border border-white/20 shrink-0" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-white truncate">{member.name}</span>
                            {member.id === activeMember.id && (
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                                YOU
                              </span>
                            )}
                            {isOnVacation && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono flex items-center gap-0.5">
                                <Palmtree className="w-2.5 h-2.5" /> AWAY
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] uppercase text-slate-400 font-mono tracking-wider">
                            {member.role.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Total Payable Box (User Requirement 3: Rent Share + Mess Bill) */}
                      <div className="text-right font-mono shrink-0 p-2 rounded-xl bg-slate-900 border border-amber-500/30">
                        <div className="text-lg font-black text-amber-400">
                          {settings.currencySymbol}{totalPayable.toFixed(2)}
                        </div>
                        <span className="text-[9px] text-slate-400 font-sans font-bold uppercase tracking-wider block">
                          Payable Amount
                        </span>
                      </div>
                    </div>

                    {/* Rent & Mess Split Breakdown Pill */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950 p-2 rounded-xl border border-white/5">
                      <div className="text-left">
                        <span className="text-slate-400 text-[10px] block">Rent Share:</span>
                        <strong className="text-indigo-300">{settings.currencySymbol}{calculatedRentShare.toFixed(2)}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Mess Bill:</span>
                        <strong className="text-emerald-400">{settings.currencySymbol}{calculatedMessBill.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Requirement 4: Option to Select Mess / Rent on Members Column */}
                    <div className="p-2.5 bg-slate-900/90 border border-white/10 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-semibold flex items-center gap-1">
                          Membership Column Role:
                          {!isAdmin && <Lock className="w-3 h-3 text-amber-400" />}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {isAdmin ? '(Admin Config)' : '(Admin Locked)'}
                        </span>
                      </div>

                      {/* 3-way toggle: Both (Mess+Rent) | Rent Only | Mess Only */}
                      <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950 rounded-lg border border-white/5 text-[11px] font-medium">
                        <button
                          type="button"
                          onClick={() => handleMembershipTypeSelect(member.id, 'both')}
                          className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                            memType === 'both'
                              ? 'bg-indigo-600 text-white font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Both (Rent+Mess)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMembershipTypeSelect(member.id, 'rent_only')}
                          className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                            memType === 'rent_only'
                              ? 'bg-indigo-600 text-white font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Rent Only
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMembershipTypeSelect(member.id, 'mess_only')}
                          className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                            memType === 'mess_only'
                              ? 'bg-indigo-600 text-white font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Mess Only
                        </button>
                      </div>
                    </div>

                    {/* Requirement 1: Days Stayed Stepper & Direct Editable Input for Admin & Super Admin */}
                    {!isRentOnly && (
                      <div className="p-3 bg-slate-900/90 border border-white/10 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-200 font-semibold block">
                              Days Stayed in Month:
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {isAdmin ? 'Admin adjustable' : 'Admin only control'}
                            </span>
                          </div>

                          {/* Stepper + Direct Input */}
                          <div className="inline-flex items-center gap-1.5 bg-slate-950 border border-white/10 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() => handleDaysChange(member.id, -1)}
                              disabled={!isAdmin || dayInfo.daysStayed <= 0}
                              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                              title={isAdmin ? 'Decrease days' : 'Only admin can change days'}
                            >
                              -
                            </button>

                            {isAdmin ? (
                              <input
                                type="number"
                                min="0"
                                max={daysInMonth}
                                value={dayInfo.daysStayed}
                                onChange={(e) => handleDirectDaysInput(member.id, e.target.value)}
                                className="w-12 text-center bg-slate-900 border border-indigo-500/40 rounded-lg py-0.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-400"
                              />
                            ) : (
                              <span className="font-mono font-bold text-sm text-white w-10 text-center">
                                {dayInfo.daysStayed}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDaysChange(member.id, 1)}
                              disabled={!isAdmin || dayInfo.daysStayed >= daysInMonth}
                              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                              title={isAdmin ? 'Increase days' : 'Only admin can change days'}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Quick Days Preset Pills */}
                        {isAdmin && (
                          <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                            <span className="text-slate-500 font-mono">Presets:</span>
                            <button
                              type="button"
                              onClick={() => handleDirectDaysInput(member.id, daysInMonth.toString())}
                              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-mono border border-white/5 cursor-pointer"
                            >
                              Full ({daysInMonth}d)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectDaysInput(member.id, '15')}
                              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-mono border border-white/5 cursor-pointer"
                            >
                              15d
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectDaysInput(member.id, '0')}
                              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-amber-300 font-mono border border-amber-500/20 cursor-pointer"
                            >
                              0d (Away)
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Formula Breakdown Line */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Formula:</span>
                      <span className="text-indigo-300 font-semibold">
                        {isRentOnly 
                          ? `Rent Only (${settings.currencySymbol}${calculatedRentShare.toFixed(2)})` 
                          : `${dayInfo.daysStayed}d × ${settings.currencySymbol}${metrics.dailyMessRate.toFixed(2)} = ${settings.currencySymbol}${calculatedMessBill.toFixed(2)}`}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        ) : (
          /* Daily Attendance View */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-950 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">Selected Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkSet(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/20 cursor-pointer"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSet(false)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-500/20 cursor-pointer"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((member) => {
                const breakfast = (currentEntry.breakfastCount[member.id] || 0) > 0;
                const lunch = (currentEntry.lunchCount[member.id] || 0) > 0;
                const dinner = (currentEntry.dinnerCount[member.id] || 0) > 0;
                const guests = currentEntry.guestMeals[member.id] || 0;

                return (
                  <div 
                    key={member.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img 
                          src={member.avatar} 
                          alt={member.name} 
                          className="w-7 h-7 rounded-full object-cover" 
                        />
                        <span className="text-xs font-bold text-white">{member.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(breakfast ? 1 : 0) + (lunch ? 1 : 0) + (dinner ? 1 : 0) + guests} meals
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleMeal(member.id, 'breakfast')}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          breakfast 
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold' 
                            : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 mx-auto mb-0.5" />
                        <span className="text-[10px]">Brkfst</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleMeal(member.id, 'lunch')}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          lunch 
                            ? 'bg-orange-500/20 border-orange-500/40 text-orange-300 font-bold' 
                            : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Coffee className="w-3.5 h-3.5 mx-auto mb-0.5" />
                        <span className="text-[10px]">Lunch</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleMeal(member.id, 'dinner')}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          dinner 
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-bold' 
                            : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 mx-auto mb-0.5" />
                        <span className="text-[10px]">Dinner</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Admin Notice Dialog */}
      {adminNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Admin Privileges Required</h3>
              <p className="text-xs text-slate-400">
                Only the Super Admin or Room Admins can adjust stayed days, modify membership plans, or update room rent settings.
              </p>
            </div>
            <button
              onClick={() => setAdminNoticeModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
