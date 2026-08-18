import React, { useState } from 'react';
import { 
  Wallet, 
  Receipt, 
  Utensils, 
  Home, 
  Zap, 
  Plus, 
  ArrowRight, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Sparkles,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Send,
  Coffee,
  Sun,
  Moon,
  Bell,
  Check,
  Share2,
  Copy,
  SkipForward
} from 'lucide-react';
import { Member, Expense, RoomSettings, DailyMealEntry, Settlement, CleaningSchedule as CleaningScheduleType, CleaningHistoryEntry } from '../types';
import { calculateMemberPayableBreakdown, calculateMessMetrics } from '../lib/storage';

interface MemberDashboardProps {
  member: Member;
  members: Member[];
  expenses: Expense[];
  meals: DailyMealEntry[];
  settlements: Settlement[];
  settings: RoomSettings;
  cleaningSchedule?: CleaningScheduleType;
  cleaningHistory?: CleaningHistoryEntry[];
  onOpenAddExpense: () => void;
  onOpenMessTab: () => void;
  onOpenSettleTab: () => void;
  onOpenCleaningTab?: () => void;
  onUpdateDailyMeal?: (entry: DailyMealEntry) => void;
  onCompleteCleaning?: (schedule: CleaningScheduleType, historyEntry: CleaningHistoryEntry) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  member,
  members,
  expenses,
  meals,
  settlements,
  settings,
  cleaningSchedule,
  cleaningHistory,
  onOpenAddExpense,
  onOpenMessTab,
  onOpenSettleTab,
  onOpenCleaningTab,
  onUpdateDailyMeal,
  onCompleteCleaning,
}) => {
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const daysInMonth = settings.daysInMonth || 30;

  // Calculate exact user-specified formula breakdown
  const breakdown = calculateMemberPayableBreakdown(
    member.id,
    members,
    expenses,
    settlements,
    daysInMonth
  );

  const messMetrics = calculateMessMetrics(expenses, meals, members, daysInMonth);

  // Today's meal status
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeal = meals.find(m => m.date === todayStr) || {
    id: `meal_${todayStr.replace(/-/g, '_')}`,
    roomId: settings.id,
    date: todayStr,
    breakfastCount: Object.fromEntries(members.map(m => [m.id, 1])),
    lunchCount: Object.fromEntries(members.map(m => [m.id, 1])),
    dinnerCount: Object.fromEntries(members.map(m => [m.id, 1])),
    guestMeals: Object.fromEntries(members.map(m => [m.id, 0])),
  };

  const hasBreakfast = (todayMeal.breakfastCount[member.id] || 0) > 0;
  const hasLunch = (todayMeal.lunchCount[member.id] || 0) > 0;
  const hasDinner = (todayMeal.dinnerCount[member.id] || 0) > 0;

  const handleToggleMeal = (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (!onUpdateDailyMeal) return;
    const key = `${mealType}Count` as 'breakfastCount' | 'lunchCount' | 'dinnerCount';
    const currentVal = todayMeal[key][member.id] || 0;
    const updated = {
      ...todayMeal,
      [key]: {
        ...todayMeal[key],
        [member.id]: currentVal > 0 ? 0 : 1,
      },
    };
    onUpdateDailyMeal(updated);
  };

  // Cleaning Turn Notification Logic
  const isMyCleaningTurn = cleaningSchedule?.currentMemberId === member.id;
  const assignedCleaningDuty = cleaningSchedule?.assignedDuties?.[member.id] || cleaningSchedule?.dutyArea || 'Bathroom & Washroom';

  const handleQuickCompleteCleaning = () => {
    if (!cleaningSchedule || !onCompleteCleaning) return;

    const nextId = cleaningSchedule.nextMemberId;
    const rota = cleaningSchedule.rotaOrder.length > 0 ? cleaningSchedule.rotaOrder : members.map(m => m.id);
    const nextIndex = rota.indexOf(nextId);
    const subsequentId = (nextIndex === -1 || nextIndex === rota.length - 1) ? rota[0] : rota[nextIndex + 1];

    const historyEntry: CleaningHistoryEntry = {
      id: `clean_${Date.now()}`,
      roomId: settings.id,
      memberId: member.id,
      memberName: member.name,
      action: 'completed',
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      dutyArea: assignedCleaningDuty,
      notes: `${assignedCleaningDuty} duty completed via Member Dashboard`,
    };

    const newSchedule: CleaningScheduleType = {
      ...cleaningSchedule,
      currentMemberId: nextId,
      nextMemberId: subsequentId,
      dutyDate: new Date().toISOString().split('T')[0],
      dutyArea: cleaningSchedule.assignedDuties?.[nextId] || 'Full Flat / Apartment',
      lastCompletedDate: new Date().toISOString().split('T')[0],
      lastCompletedBy: member.id,
    };

    onCompleteCleaning(newSchedule, historyEntry);
    setBadgeModalOpen(true);
  };

  const generateBadgeText = () => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return `🏆 *ROOMEX CLEANLINESS CHAMPION BADGE* 🏆\n\n✨ *Duty Completed By:* ${member.name}\n🏠 *Room:* ${settings.name} (${settings.roomCode})\n🧹 *Duty Area:* ${assignedCleaningDuty}\n📅 *Date:* ${today}\n\n🧼 *Status:* Sparkling clean, sanitized, and inspected!\nKeep our flat shining! ⭐\n_Generated via ROOMEX Mess & Room Management App_\n_App developed by sakeerputhan_`;
  };

  const handleShareBadgeWhatsApp = () => {
    const text = generateBadgeText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyBadgeText = () => {
    const text = generateBadgeText();
    navigator.clipboard.writeText(text);
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  };

  // UPI QR String
  const upiIdToUse = member.upiId || settings.createdById || 'roomex@upi';
  const upiAmount = Math.max(0, breakdown.finalRemainingDue);
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    `upi://pay?pa=${upiIdToUse}&pn=${encodeURIComponent(settings.name)}&am=${upiAmount.toFixed(2)}&cu=${settings.currency === 'INR' ? 'INR' : 'INR'}&tn=${encodeURIComponent('Roomex Settlement')}`
  )}`;

  // Filter recent expenses related to this member
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in max-w-4xl mx-auto">
      
      {/* 🔔 CLEANING TURN POPUP / NOTIFICATION BANNER */}
      {isMyCleaningTurn && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-3xl p-4 sm:p-5 shadow-2xl text-white relative overflow-hidden border border-emerald-400/40 animate-pulse-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-lg text-amber-300">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-sm">
                    ATTENTION {member.name.toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-emerald-100">
                    Cleaning Turn Today
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  Your Duty: <span className="underline decoration-amber-300 decoration-2">{assignedCleaningDuty}</span>
                </h3>
                <p className="text-xs text-emerald-100 font-medium">
                  Please complete the duty and check off below to notify roommates and receive your Cleanliness Champion Badge!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {onOpenCleaningTab && (
                <button
                  type="button"
                  onClick={onOpenCleaningTab}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                >
                  Schedule
                </button>
              )}
              <button
                type="button"
                onClick={handleQuickCompleteCleaning}
                className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-emerald-400 text-xs font-extrabold shadow-xl flex items-center gap-2 transition-transform active:scale-95 cursor-pointer border border-emerald-400/40"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Complete Duty</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. HERO PAYABLE CARD (MOBILE OPTIMIZED WITH EXACT USER FORMULA) */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
        breakdown.finalRemainingDue > 0.01 
          ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border-emerald-500/40 shadow-emerald-950/30' 
          : breakdown.finalRemainingDue < -0.01 
            ? 'bg-gradient-to-br from-blue-950/90 via-slate-900 to-slate-950 border-blue-500/40 shadow-blue-950/30'
            : 'bg-slate-900 border-white/15'
      }`}>
        
        {/* Subtle Background Glow */}
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300 font-mono">
                MY FINAL PAYABLE AMOUNT
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                breakdown.status === 'owes' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : breakdown.status === 'gets_back' 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                    : 'bg-slate-800 text-slate-300 border border-white/10'
              }`}>
                {breakdown.status === 'owes' ? 'Amount to Pay' : breakdown.status === 'gets_back' ? 'Amount to Receive' : 'Settled'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                breakdown.status === 'owes' 
                  ? 'text-emerald-400' 
                  : breakdown.status === 'gets_back' 
                    ? 'text-blue-400' 
                    : 'text-white'
              }`}>
                {settings.currencySymbol}{Math.abs(breakdown.finalRemainingDue).toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {breakdown.status === 'owes' ? '(Your Share Due)' : breakdown.status === 'gets_back' ? '(Overpaid Advance)' : '(All Cleared)'}
              </span>
            </div>

            <p className="text-xs text-slate-400 pt-1">
              {breakdown.status === 'owes' 
                ? 'Pay your pending share to the room pool or roommate via UPI below.' 
                : breakdown.status === 'gets_back' 
                  ? 'You paid extra for room purchases and will receive this refund.' 
                  : 'You have no outstanding dues for this month!'}
            </p>
          </div>

          {/* Quick Pay Action Button */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {breakdown.finalRemainingDue > 0.01 && (
              <button
                onClick={() => setShowUpiModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Pay via UPI QR</span>
              </button>
            )}

            <button
              onClick={onOpenAddExpense}
              className="px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Bill</span>
            </button>
          </div>

        </div>

        {/* 2. EXACT FORMULA BREAKDOWN GRID (Requirement 2 & 3) */}
        <div className="mt-5 pt-4 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="uppercase font-bold text-indigo-300">CALCULATION BREAKDOWN FORMULA:</span>
            <span>Mess + Rent + Other - Purchases</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
            
            {/* Box 1: Mess Bill */}
            <div className="p-3 bg-slate-950/70 border border-white/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-[10px] text-orange-400 font-bold uppercase font-mono">
                <span>1. MESS BILL</span>
                <Utensils className="w-3.5 h-3.5" />
              </div>
              <div className="text-base font-black font-mono text-white">
                {member.membershipType === 'rent_only' ? (
                  <span className="text-slate-500 text-xs">₹0.00 (Rent Only)</span>
                ) : (
                  `${settings.currencySymbol}${breakdown.messBill.toFixed(2)}`
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {member.membershipType === 'rent_only' 
                  ? 'Exempt' 
                  : `${settings.currencySymbol}${messMetrics.dailyMessRate.toFixed(2)}/day × ${breakdown.daysStayed}d`}
              </div>
            </div>

            {/* Box 2: Room Rent Share */}
            <div className="p-3 bg-slate-950/70 border border-white/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-[10px] text-indigo-400 font-bold uppercase font-mono">
                <span>2. ROOM RENT</span>
                <Home className="w-3.5 h-3.5" />
              </div>
              <div className="text-base font-black font-mono text-white">
                {settings.currencySymbol}{breakdown.rentShare.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Your split share
              </div>
            </div>

            {/* Box 3: Other Utilities & Expenses */}
            <div className="p-3 bg-slate-950/70 border border-white/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold uppercase font-mono">
                <span>3. OTHER BILLS</span>
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="text-base font-black font-mono text-white">
                {settings.currencySymbol}{breakdown.otherExpensesShare.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Wi-Fi, Power, Maid, etc.
              </div>
            </div>

            {/* Box 4: Member Purchases (Deduction) */}
            <div className="p-3 bg-slate-950/70 border border-emerald-500/30 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold uppercase font-mono">
                <span>4. MY PURCHASES</span>
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <div className="text-base font-black font-mono text-emerald-300">
                - {settings.currencySymbol}{breakdown.memberPurchases.toFixed(2)}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                Paid upfront (Deducted)
              </div>
            </div>

          </div>

          {/* Mathematical Summary Line */}
          <div className="p-2.5 bg-slate-950/90 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono text-slate-300">
            <span className="text-slate-400 text-[11px]">Exact Formula:</span>
            <span className="font-bold text-amber-300 truncate pl-2">
              {breakdown.formulaString}
            </span>
          </div>

        </div>

      </div>

      {/* 2. TODAY'S MEAL & STAY LOGGER (MOBILE FRIENDLY 1-TAP TOUCH TARGETS) */}
      <div className="p-4 sm:p-5 bg-slate-900 border border-white/10 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">Today's Meals & Stay Log</h3>
            <span className="text-[10px] text-slate-500 font-mono">{todayStr}</span>
          </div>
          <button
            onClick={onOpenMessTab}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
          >
            <span>View Full Month</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {member.membershipType === 'rent_only' ? (
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-white/5 text-xs text-slate-400">
            You are enrolled as <strong>Rent Only</strong> (Mess bill is ₹0.00). You do not need to mark daily meals.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            
            <button
              onClick={() => handleToggleMeal('breakfast')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 min-h-[64px] ${
                hasBreakfast 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' 
                  : 'bg-slate-950 border-white/10 text-slate-500'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span className="text-xs font-bold">Breakfast</span>
              <span className="text-[10px] font-mono">{hasBreakfast ? 'YES (1)' : 'OFF (0)'}</span>
            </button>

            <button
              onClick={() => handleToggleMeal('lunch')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 min-h-[64px] ${
                hasLunch 
                  ? 'bg-orange-500/20 border-orange-500/40 text-orange-200' 
                  : 'bg-slate-950 border-white/10 text-slate-500'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span className="text-xs font-bold">Lunch</span>
              <span className="text-[10px] font-mono">{hasLunch ? 'YES (1)' : 'OFF (0)'}</span>
            </button>

            <button
              onClick={() => handleToggleMeal('dinner')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 min-h-[64px] ${
                hasDinner 
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200' 
                  : 'bg-slate-950 border-white/10 text-slate-500'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span className="text-xs font-bold">Dinner</span>
              <span className="text-[10px] font-mono">{hasDinner ? 'YES (1)' : 'OFF (0)'}</span>
            </button>

          </div>
        )}
      </div>

      {/* 3. RECENT ROOM PURCHASES / BILLS */}
      <div className="p-4 sm:p-5 bg-slate-900 border border-white/10 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Recent Room Purchases</h3>
          </div>
          <button
            onClick={onOpenAddExpense}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
          >
            + Add New
          </button>
        </div>

        <div className="space-y-2">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs font-mono">
              No bills recorded yet. Click "+ Add Bill" to record one!
            </div>
          ) : (
            recentExpenses.map((exp) => {
              const payer = members.find(m => m.id === exp.paidBy);
              const isPaidByMe = exp.paidBy === member.id;
              const mySplit = exp.splits.find(s => s.memberId === member.id);

              return (
                <div 
                  key={exp.id} 
                  className="p-3 bg-slate-950/70 border border-white/5 hover:border-white/15 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      {exp.category === 'mess_food' || exp.category === 'groceries' ? (
                        <Utensils className="w-4 h-4 text-orange-400" />
                      ) : exp.category === 'rent' ? (
                        <Home className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Receipt className="w-4 h-4 text-teal-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{exp.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        Paid by {isPaidByMe ? <strong className="text-emerald-400">You</strong> : payer?.name || 'Roommate'} • {new Date(exp.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black font-mono text-white">
                      {settings.currencySymbol}{exp.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Your share: <strong className="text-slate-200">{settings.currencySymbol}{(mySplit ? mySplit.amount : 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* UPI QR PAYMENT MODAL */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-emerald-400">
                <QrCode className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Scan & Pay Mess/Room Due</h3>
              </div>
              <button 
                onClick={() => setShowUpiModal(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Payable Amount</span>
              <div className="text-3xl font-black font-mono text-emerald-400">
                {settings.currencySymbol}{breakdown.finalRemainingDue.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400">
                Scan using Google Pay, PhonePe, Paytm, or any UPI App
              </p>
            </div>

            {/* QR Image */}
            <div className="p-3 bg-white rounded-2xl w-52 h-52 mx-auto flex items-center justify-center shadow-lg">
              <img 
                src={upiQrUrl} 
                alt="UPI Payment QR Code" 
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            <div className="text-xs font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-white/5 truncate">
              UPI ID: <strong className="text-slate-200">{upiIdToUse}</strong>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowUpiModal(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowUpiModal(false);
                  onOpenSettleTab();
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-md shadow-emerald-500/20"
              >
                Record Payment
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Celebratory WhatsApp Cleanliness Champion Badge Modal */}
      {badgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
            
            {/* Modal Header Badge */}
            <div className="p-6 bg-gradient-to-b from-emerald-600/30 via-slate-900 to-slate-900 text-center space-y-2 border-b border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 text-2xl font-black">
                🏆
              </div>
              <h3 className="text-lg font-extrabold text-white">Cleaning Duty Completed!</h3>
              <p className="text-xs text-emerald-300 font-medium">
                Thank you, <strong>{member.name}</strong>! <strong>{assignedCleaningDuty}</strong> is sparkling clean.
              </p>
            </div>

            {/* Formatted Badge Text Preview */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">
                {generateBadgeText()}
              </div>

              {/* Share & Copy Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleShareBadgeWhatsApp}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyBadgeText}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 transition-all cursor-pointer"
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
                className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
