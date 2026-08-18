import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Receipt, 
  Utensils, 
  Zap, 
  Wifi, 
  Home, 
  Flame, 
  Droplet, 
  Sparkles, 
  DollarSign, 
  Users, 
  Calculator,
  Percent,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { 
  Member, 
  Expense, 
  ExpenseCategory, 
  SplitType, 
  SplitShare, 
  RoomSettings, 
  DailyMealEntry 
} from '../types';
import { calculateMemberMeals } from '../lib/storage';
import { BillScannerModal } from './BillScannerModal';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  activeMember: Member;
  settings: RoomSettings;
  meals: DailyMealEntry[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  editingExpense?: Expense | null;
}

const CATEGORIES: { id: ExpenseCategory; label: string; icon: any; color: string }[] = [
  { id: 'mess_food', label: 'Mess Food', icon: Utensils, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  { id: 'groceries', label: 'Groceries', icon: Utensils, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'rent', label: 'Room Rent', icon: Home, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  { id: 'electricity', label: 'Electricity', icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'internet', label: 'Wi-Fi / Net', icon: Wifi, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { id: 'gas_cylinder', label: 'Cooking Gas', icon: Flame, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { id: 'maid_cook', label: 'Cook / Maid', icon: Users, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'water', label: 'Water Cans', icon: Droplet, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'cleaning', label: 'Cleaning Items', icon: Sparkles, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
  { id: 'other', label: 'Other Misc', icon: Receipt, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30' },
];

const SUGGESTIONS = [
  'Weekly Mess Groceries',
  'Flat Rent Payment',
  'Wi-Fi Broadband Bill',
  'LPG Gas Cylinder Refill',
  'Daily Veggies & Milk',
  'Cook Monthly Salary',
  'Drinking Water Refill',
  'Electricity Utility',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  members,
  activeMember,
  settings,
  meals,
  onAddExpense,
  editingExpense,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('mess_food');
  const [paidBy, setPaidBy] = useState<string>(activeMember.id);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [isMessExpense, setIsMessExpense] = useState(true);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [autoScanned, setAutoScanned] = useState(false);

  // Rent split mode: 'all' (equal to all members) or 'custom' (select members)
  const [rentSplitMode, setRentSplitMode] = useState<'all' | 'custom'>('all');

  // Split configurations
  const [selectedMembers, setSelectedMembers] = useState<string[]>(members.map(m => m.id));
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setPaidBy(editingExpense.paidBy);
      setDate(editingExpense.date.split('T')[0]);
      setSplitType(editingExpense.splitType);
      setIsMessExpense(editingExpense.isMessExpense ?? false);
      setNotes(editingExpense.notes || '');
      setReceiptUrl(editingExpense.receiptUrl);
      setAutoScanned(editingExpense.autoScanned ?? false);

      const activeSplitMembers = editingExpense.splits.map(s => s.memberId);
      setSelectedMembers(activeSplitMembers);
      if (editingExpense.category === 'rent') {
        setRentSplitMode(activeSplitMembers.length === members.length ? 'all' : 'custom');
      }

      const exactMap: Record<string, string> = {};
      const pctMap: Record<string, string> = {};
      editingExpense.splits.forEach(s => {
        exactMap[s.memberId] = s.amount.toString();
        if (s.percentage) pctMap[s.memberId] = s.percentage.toString();
      });
      setExactAmounts(exactMap);
      setPercentages(pctMap);
    } else {
      // Default reset
      setTitle('');
      setAmount('');
      setCategory('mess_food');
      setPaidBy(activeMember.id);
      setDate(new Date().toISOString().split('T')[0]);
      setSplitType('equal');
      setIsMessExpense(true);
      setNotes('');
      setReceiptUrl(undefined);
      setAutoScanned(false);
      setRentSplitMode('all');
      setSelectedMembers(members.map(m => m.id));
      setExactAmounts({});
      setPercentages({});
    }
  }, [editingExpense, isOpen, members, activeMember.id]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  // Calculate splits based on current splitType
  const computeSplits = (): SplitShare[] => {
    if (splitType === 'equal') {
      const activeTargets = (category === 'rent' && rentSplitMode === 'all')
        ? members.filter(m => m.membershipType !== 'mess_only').map(m => m.id)
        : selectedMembers;

      const count = activeTargets.length > 0 ? activeTargets.length : 1;
      const equalShare = Math.round((numAmount / count) * 100) / 100;

      return activeTargets.map((mId, index) => {
        // adjust last item for penny rounding
        const amt = index === count - 1 
          ? Math.round((numAmount - equalShare * (count - 1)) * 100) / 100 
          : equalShare;
        return {
          memberId: mId,
          amount: amt,
        };
      });
    }

    if (splitType === 'exact') {
      return members
        .filter(m => (parseFloat(exactAmounts[m.id]) || 0) > 0)
        .map(m => ({
          memberId: m.id,
          amount: parseFloat(exactAmounts[m.id]) || 0,
        }));
    }

    if (splitType === 'percentage') {
      return members
        .filter(m => (parseFloat(percentages[m.id]) || 0) > 0)
        .map(m => {
          const pct = parseFloat(percentages[m.id]) || 0;
          return {
            memberId: m.id,
            amount: Math.round(((numAmount * pct) / 100) * 100) / 100,
            percentage: pct,
          };
        });
    }

    if (splitType === 'meal_share') {
      let totalMeals = 0;
      const memberMeals: Record<string, number> = {};
      members.forEach(m => {
        const mInfo = calculateMemberMeals(m.id, meals);
        memberMeals[m.id] = mInfo.total;
        totalMeals += mInfo.total;
      });

      if (totalMeals === 0) {
        const count = members.length;
        const equalShare = Math.round((numAmount / count) * 100) / 100;
        return members.map(m => ({
          memberId: m.id,
          amount: equalShare,
          mealsCount: 0,
        }));
      }

      return members.map(m => {
        const mCount = memberMeals[m.id] || 0;
        const share = Math.round(((numAmount * mCount) / totalMeals) * 100) / 100;
        return {
          memberId: m.id,
          amount: share,
          mealsCount: mCount,
        };
      });
    }

    return [];
  };

  const calculatedSplits = computeSplits();
  const splitsSum = calculatedSplits.reduce((acc, s) => acc + s.amount, 0);
  const isSplitValid = Math.abs(splitsSum - numAmount) < 0.05 && numAmount > 0 && calculatedSplits.length > 0;

  const handleCategorySelect = (catId: ExpenseCategory) => {
    setCategory(catId);
    if (catId === 'rent') {
      setIsMessExpense(false);
      if (rentSplitMode === 'all') {
        setSelectedMembers(members.filter(m => m.membershipType !== 'mess_only').map(m => m.id));
      }
    } else if (catId === 'mess_food' || catId === 'groceries' || catId === 'gas_cylinder') {
      setIsMessExpense(true);
      // default select mess active members
      const messMembers = members.filter(m => m.membershipType !== 'rent_only').map(m => m.id);
      setSelectedMembers(messMembers.length > 0 ? messMembers : members.map(m => m.id));
    } else {
      setIsMessExpense(false);
    }
  };

  const handleToggleMemberSelect = (id: string) => {
    if (selectedMembers.includes(id)) {
      if (selectedMembers.length > 1) {
        setSelectedMembers(selectedMembers.filter(mId => mId !== id));
      }
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const handleScanComplete = (scannedData: {
    title: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
    receiptUrl: string;
    isMessExpense: boolean;
  }) => {
    setTitle(scannedData.title);
    setAmount(scannedData.amount.toString());
    setCategory(scannedData.category);
    setDate(scannedData.date);
    setReceiptUrl(scannedData.receiptUrl);
    setIsMessExpense(scannedData.isMessExpense);
    setAutoScanned(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || numAmount <= 0) {
      alert('Please enter a valid title and expense amount');
      return;
    }

    if (!isSplitValid) {
      alert(`The split total (${settings.currencySymbol}${splitsSum.toFixed(2)}) must match the expense amount (${settings.currencySymbol}${numAmount.toFixed(2)}).`);
      return;
    }

    onAddExpense({
      roomId: settings.id,
      title: title.trim(),
      amount: numAmount,
      category,
      paidBy,
      splitType,
      splits: calculatedSplits,
      date: new Date(date).toISOString(),
      notes: notes.trim() || undefined,
      receiptUrl,
      autoScanned,
      createdBy: activeMember.id,
      isMessExpense: isMessExpense || category === 'mess_food' || category === 'groceries' || category === 'gas_cylinder',
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div 
          className="bg-slate-900 border border-indigo-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  {editingExpense ? 'Edit Purchase / Expense' : 'Add Room Purchase'}
                  {autoScanned && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Auto-Scanned
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Room spend, mess food, rent & shared utilities
                </p>
              </div>
            </div>

            {/* Quick Auto Scan Button in Header */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Auto-Scan Bill</span>
                <span className="sm:hidden">Scan</span>
              </button>

              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
            
            {/* AI Auto-Scan Banner Shortcut */}
            {!receiptUrl && (
              <div 
                onClick={() => setIsScannerOpen(true)}
                className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 hover:border-indigo-400/50 cursor-pointer flex items-center justify-between gap-3 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Auto Scan Bill / Receipt</span>
                    <span className="text-[11px] text-slate-400">Take a photo to automatically extract amount, vendor & category</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-400 group-hover:underline flex items-center gap-1 font-mono">
                  Scan Now →
                </span>
              </div>
            )}

            {/* Scanned Receipt Preview Banner */}
            {receiptUrl && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={receiptUrl} 
                    alt="Receipt" 
                    className="w-10 h-10 rounded-lg object-cover border border-white/10" 
                  />
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Receipt Attached
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Will be saved with this purchase</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Rescan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptUrl(undefined);
                      setAutoScanned(false);
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Quick Fill Ideas */}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
                Quick Fill Ideas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setTitle(sug)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-white/10 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Amount Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Purchase / Bill Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Mess Vegetables"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount ({settings.currencySymbol}) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-400">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-7 pr-3 py-2.5 text-xs text-white font-mono font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Category Selector Grid */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center min-h-[64px] ${
                        isSelected 
                          ? `${cat.color} font-semibold ring-2 ring-indigo-500 shadow-md` 
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paid By & Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Who Paid for this? *</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Category Specific Splitting Controls */}
            {category === 'rent' ? (
              /* Requirement 1: Room Rent equal to all with option for selection */
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Room Rent Splitting Option</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded">
                    Equal Split
                  </span>
                </div>

                {/* Option 1: Equal to All vs Option 2: Select Specific Members */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRentSplitMode('all');
                      setSelectedMembers(members.filter(m => m.membershipType !== 'mess_only').map(m => m.id));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      rentSplitMode === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Equal to All Roommates</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRentSplitMode('custom')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      rentSplitMode === 'custom'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Select Specific Roommates</span>
                  </button>
                </div>

                {/* Roommate Checklist if Custom Selection is Active */}
                {rentSplitMode === 'custom' && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[11px] text-slate-300 block font-medium">
                      Select which roommates share this rent:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {members.map((m) => {
                        const isChecked = selectedMembers.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleMemberSelect(m.id)}
                            className={`p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                              isChecked
                                ? 'bg-indigo-500/20 border-indigo-500 text-white font-medium'
                                : 'bg-slate-950/60 border-white/10 text-slate-400'
                            }`}
                          >
                            <span className="truncate">{m.name}</span>
                            {isChecked && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* General Split Selector */
              <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-indigo-400" /> Split Method
                  </label>
                  <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setSplitType('equal')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        splitType === 'equal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Equal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitType('exact')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        splitType === 'exact' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Exact
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitType('percentage')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        splitType === 'percentage' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      %
                    </button>
                    {isMessExpense && (
                      <button
                        type="button"
                        onClick={() => setSplitType('meal_share')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          splitType === 'meal_share' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Meals
                      </button>
                    )}
                  </div>
                </div>

                {/* Equal Split Roommates Selector */}
                {splitType === 'equal' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Select included roommates:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMembers(members.map(m => m.id))}
                        className="text-indigo-400 hover:underline font-mono text-[11px]"
                      >
                        Select All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {members.map((m) => {
                        const isSelected = selectedMembers.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleMemberSelect(m.id)}
                            className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                                : 'bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="truncate">{m.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Exact Amounts Inputs */}
                {splitType === 'exact' && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 block font-medium">
                      Enter exact amount for each roommate:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-white/10">
                          <span className="text-xs text-slate-200 font-medium truncate">{m.name}</span>
                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">
                              {settings.currencySymbol}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={exactAmounts[m.id] || ''}
                              onChange={(e) => setExactAmounts({ ...exactAmounts, [m.id]: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg pl-6 pr-2 py-1 text-xs text-right text-white font-mono focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Percentage Inputs */}
                {splitType === 'percentage' && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 block font-medium">
                      Specify percentage for each roommate (Total 100%):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-white/10">
                          <span className="text-xs text-slate-200 font-medium truncate">{m.name}</span>
                          <div className="relative w-24 shrink-0">
                            <input
                              type="number"
                              step="1"
                              placeholder="0"
                              value={percentages[m.id] || ''}
                              onChange={(e) => setPercentages({ ...percentages, [m.id]: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-right text-white font-mono focus:border-indigo-500 focus:outline-none pr-6"
                            />
                            <span className="absolute right-2 top-1 text-xs text-slate-400">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Split Calculation Verification Bar */}
                <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs">
                  <span className="text-slate-400">Calculated Total:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={isSplitValid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {settings.currencySymbol}{splitsSum.toFixed(2)} / {settings.currencySymbol}{numAmount.toFixed(2)}
                    </span>
                    {isSplitValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Optional Notes</label>
              <input
                type="text"
                placeholder="e.g. Paid via UPI, bill attached"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

          </form>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between bg-slate-950/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim() || numAmount <= 0 || !isSplitValid}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingExpense ? 'Save Changes' : 'Record Purchase'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Embedded Bill Scanner Modal */}
      <BillScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        currencySymbol={settings.currencySymbol}
        onScanComplete={handleScanComplete}
      />
    </>
  );
};
