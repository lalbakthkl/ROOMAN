import React, { useState } from 'react';
import { 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  DollarSign, 
  History, 
  CreditCard, 
  Send,
  X,
  Wallet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Member, 
  Expense, 
  Settlement, 
  RoomSettings, 
  SimplifiedDebt 
} from '../types';
import { calculateNetBalances, simplifyDebts } from '../lib/storage';

interface BalancesAndSettleProps {
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  settings: RoomSettings;
  activeMember: Member;
  onRecordSettlement: (settlement: Omit<Settlement, 'id'>) => void;
}

export const BalancesAndSettle: React.FC<BalancesAndSettleProps> = ({
  members,
  expenses,
  settlements,
  settings,
  activeMember,
  onRecordSettlement,
}) => {
  const [selectedDebt, setSelectedDebt] = useState<SimplifiedDebt | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash' | 'bank_transfer' | 'other'>('upi');
  const [referenceId, setReferenceId] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [copiedUpiId, setCopiedUpiId] = useState<string | null>(null);

  const memberMap = new Map<string, Member>(members.map(m => [m.id, m]));
  const netBalances = calculateNetBalances(members, expenses, settlements, settings);
  const simplifiedDebts = simplifyDebts(members, expenses, settlements, settings);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899'],
      });
    } catch (e) {
      console.log('Confetti trigger skipped', e);
    }
  };

  const handleOpenSettleModal = (debt: SimplifiedDebt) => {
    setSelectedDebt(debt);
    setSettleAmount(debt.amount.toString());
    setPaymentMethod('upi');
    setReferenceId('');
    setSettleNotes(`Settlement between ${memberMap.get(debt.fromMemberId)?.name} and ${memberMap.get(debt.toMemberId)?.name}`);
  };

  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    const numAmt = parseFloat(settleAmount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    onRecordSettlement({
      roomId: settings.id,
      fromMemberId: selectedDebt.fromMemberId,
      toMemberId: selectedDebt.toMemberId,
      amount: numAmt,
      date: new Date().toISOString(),
      paymentMethod,
      referenceId: referenceId.trim() || undefined,
      notes: settleNotes.trim() || undefined,
      recordedBy: activeMember.id,
    });

    triggerConfetti();
    setSelectedDebt(null);
  };

  const handleCopyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpiId(upiId);
    setTimeout(() => setCopiedUpiId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Net Balances Overview */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-400" />
              Roommate Net Balances
            </h3>
            <p className="text-xs text-slate-500">
              Positive balances are owed to the member; negative balances are debts to be paid.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {members.map((member) => {
            const bal = netBalances[member.id] || 0;
            const isOwed = bal > 0.01;
            const isDebt = bal < -0.01;
            const isSettled = Math.abs(bal) <= 0.01;

            return (
              <div 
                key={member.id}
                className={`p-4 rounded-xl border transition-all ${
                  isOwed 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : isDebt 
                      ? 'bg-rose-500/10 border-rose-500/30' 
                      : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={member.avatar} 
                    alt="" 
                    className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0" 
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-slate-100 truncate block">
                      {member.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      {member.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isOwed ? 'Gets back:' : isDebt ? 'Owes:' : 'Settled up'}
                  </span>
                  <span className={`font-mono font-medium text-base ${
                    isOwed ? 'text-emerald-400' : isDebt ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {isOwed ? `+${settings.currencySymbol}${bal.toFixed(2)}` : isDebt ? `-${settings.currencySymbol}${Math.abs(bal).toFixed(2)}` : `${settings.currencySymbol}0.00`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Debt Simplification Engine */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Simplified Debt Matrix ({simplifiedDebts.length} Transactions)
            </h3>
            <p className="text-xs text-slate-500">
              Optimal settlements to clear all roommate accounts with the fewest payments.
            </p>
          </div>
        </div>

        {simplifiedDebts.length === 0 ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-white text-sm">Everyone is all settled up!</h4>
            <p className="text-xs text-slate-400">
              There are no outstanding debts between roommates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {simplifiedDebts.map((debt, idx) => {
              const fromMember = memberMap.get(debt.fromMemberId);
              const toMember = memberMap.get(debt.toMemberId);
              const isPayerActive = activeMember.id === debt.fromMemberId;
              const isReceiverActive = activeMember.id === debt.toMemberId;

              return (
                <div 
                  key={`debt-${debt.fromMemberId}-${debt.toMemberId}-${idx}`}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isPayerActive 
                      ? 'bg-rose-500/10 border-rose-500/40' 
                      : isReceiverActive 
                        ? 'bg-emerald-500/10 border-emerald-500/40' 
                        : 'bg-white/[0.02] border-white/10'
                  }`}
                >
                  {/* From -> To Representation */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <img src={fromMember?.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-white/20" />
                      <span className="text-xs font-semibold text-slate-200">{fromMember?.name.split(' ')[0]}</span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />

                    <div className="flex items-center gap-1.5">
                      <img src={toMember?.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-white/20" />
                      <span className="text-xs font-semibold text-slate-200">{toMember?.name.split(' ')[0]}</span>
                    </div>
                  </div>

                  {/* Amount & Settle Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                    <div className="text-left sm:text-right">
                      <span className="font-mono font-medium text-base text-white">
                        {settings.currencySymbol}{debt.amount.toFixed(2)}
                      </span>
                      {toMember?.upiId && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>UPI: {toMember.upiId}</span>
                          <button
                            onClick={() => handleCopyUpi(toMember.upiId!)}
                            className="text-indigo-400 hover:text-indigo-300"
                            title="Copy UPI handle"
                          >
                            {copiedUpiId === toMember.upiId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenSettleModal(debt)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                    >
                      Settle Up
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Settlement History */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          Recent Settlement Payments ({settlements.length})
        </h3>

        {settlements.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No settlement payments recorded yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {settlements.slice().reverse().map((s) => {
              const fromM = memberMap.get(s.fromMemberId);
              const toM = memberMap.get(s.toMemberId);

              return (
                <div 
                  key={s.id}
                  className="p-3 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-medium text-slate-200">
                        {fromM?.name || 'Member'} paid {toM?.name || 'Member'}
                      </span>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="uppercase font-mono font-medium text-indigo-400">{s.paymentMethod}</span>
                        {s.referenceId && <span>Ref: {s.referenceId}</span>}
                        <span>• {new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <span className="font-mono font-medium text-sm text-emerald-400">
                    {settings.currencySymbol}{s.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settle Up Payment Modal */}
      {selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            
            {/* Mobile Sheet Drag Pill */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                Record Settlement Payment
              </h3>
              <button 
                onClick={() => setSelectedDebt(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-400">Paying from:</span>
              <span className="font-semibold text-white">{memberMap.get(selectedDebt.fromMemberId)?.name}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-400">Paying to:</span>
              <div className="text-right">
                <span className="font-semibold text-white block">{memberMap.get(selectedDebt.toMemberId)?.name}</span>
                {memberMap.get(selectedDebt.toMemberId)?.upiId && (
                  <span className="text-[10px] text-indigo-300 font-mono">
                    UPI: {memberMap.get(selectedDebt.toMemberId)?.upiId}
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleConfirmSettlement} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Settlement Amount ({settings.currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-base font-semibold text-white font-mono focus:border-indigo-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'upi', label: 'UPI / Scan' },
                    { id: 'cash', label: 'Cash' },
                    { id: 'bank_transfer', label: 'Bank' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-2.5 rounded-xl border text-xs font-medium transition-colors min-h-[44px] ${
                        paymentMethod === m.id
                          ? 'border-indigo-500 bg-indigo-600/20 text-white font-semibold'
                          : 'border-white/10 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Reference / Txn ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-4982018491"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedDebt(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-medium hover:bg-white/10 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Settle
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
