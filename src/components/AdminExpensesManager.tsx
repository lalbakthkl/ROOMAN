import React, { useState } from 'react';
import { 
  Home, 
  DollarSign, 
  PlusCircle, 
  Zap, 
  Wifi, 
  Flame, 
  Droplets, 
  Utensils, 
  ShoppingBag, 
  Sparkles, 
  Calendar, 
  Users, 
  Check, 
  Trash2, 
  Receipt, 
  Tag, 
  Filter, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Layers,
  Plus,
  HelpCircle,
  Clock,
  ShieldCheck,
  Building
} from 'lucide-react';
import { 
  Member, 
  RoomSettings, 
  Expense, 
  ExpenseCategory, 
  SplitType, 
  SplitShare 
} from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface AdminExpensesManagerProps {
  members: Member[];
  activeMember: Member;
  settings: RoomSettings;
  expenses: Expense[];
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onOpenAddExpenseModal?: () => void;
  onUpdateSettings?: (settings: RoomSettings) => void;
  onUpdatePresetRent?: (presetActive: boolean, amount: number, type: 'total_room' | 'per_member') => void;
  onUpdateMemberCustomRent?: (memberId: string, customRent: number | undefined) => void;
}

export const AdminExpensesManager: React.FC<AdminExpensesManagerProps> = ({
  members,
  activeMember,
  settings,
  expenses = [],
  onSaveExpense,
  onDeleteExpense,
  onOpenAddExpenseModal,
  onUpdateSettings,
  onUpdatePresetRent,
  onUpdateMemberCustomRent,
}) => {
  const [expenseMode, setExpenseMode] = useState<'rent' | 'custom'>('rent');

  // --- RENT FORM STATE ---
  // Rent Payment Model: 'month_end_pool' (No one paid upfront, collected at month end) vs 'upfront_member' (Paid by a specific roommate)
  const [rentPaymentModel, setRentPaymentModel] = useState<'month_end_pool' | 'upfront_member'>('month_end_pool');
  const [rentTitle, setRentTitle] = useState('Monthly Flat Rent');
  const [rentAmount, setRentAmount] = useState(
    settings.presetRentAmount ? String(settings.presetRentAmount) : ''
  );
  const [rentType, setRentType] = useState<'total_room' | 'per_member'>(settings.presetRentType || 'total_room');
  const [rentPayerId, setRentPayerId] = useState(activeMember.id);
  const [rentDate, setRentDate] = useState(new Date().toISOString().split('T')[0]);
  const [rentSplitType, setRentSplitType] = useState<'all_rent_eligible' | 'selected_members'>('all_rent_eligible');
  const [rentSelectedMembers, setRentSelectedMembers] = useState<string[]>(() => 
    members.filter(m => m.membershipType !== 'mess_only').map(m => m.id)
  );
  const [rentNotes, setRentNotes] = useState('');

  // --- CUSTOM EXPENSE FORM STATE ---
  const [customCategory, setCustomCategory] = useState<ExpenseCategory>('electricity');
  const [customTitle, setCustomTitle] = useState('Electricity Bill');
  const [customAmount, setCustomAmount] = useState('');
  const [customPayerId, setCustomPayerId] = useState(activeMember.id);
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customSplitType, setCustomSplitType] = useState<SplitType>('equal');
  const [customSelectedMembers, setCustomSelectedMembers] = useState<string[]>(() => members.map(m => m.id));
  const [customExactShares, setCustomExactShares] = useState<Record<string, string>>({});
  const [customNotes, setCustomNotes] = useState('');

  // --- GENERAL UI STATE ---
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<'all' | 'rent' | 'utilities' | 'mess_groceries' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  const currency = settings.currencySymbol || '₹';
  const memberMap = new Map<string, Member>(members.map(m => [m.id, m]));

  // Eligible rent members
  const rentEligibleMembers = rentSplitType === 'all_rent_eligible'
    ? members.filter(m => m.membershipType !== 'mess_only')
    : members.filter(m => rentSelectedMembers.includes(m.id));

  const parsedRentAmount = parseFloat(rentAmount) || 0;
  
  // Calculate per member share for display
  const perMemberRentShare = rentType === 'per_member'
    ? parsedRentAmount
    : (rentEligibleMembers.length > 0 ? parsedRentAmount / rentEligibleMembers.length : 0);

  const totalCalculatedRent = rentType === 'per_member'
    ? parsedRentAmount * rentEligibleMembers.length
    : parsedRentAmount;

  // Category Configuration
  const categoriesConfig: {
    id: ExpenseCategory;
    name: string;
    icon: any;
    color: string;
    defaultTitle: string;
    presets: string[];
  }[] = [
    {
      id: 'electricity',
      name: 'Electricity',
      icon: Zap,
      color: 'from-amber-500/20 to-amber-600/10 text-amber-300 border-amber-500/30',
      defaultTitle: 'Electricity Bill',
      presets: ['Electricity Bill', 'Power Unit Recharge', 'EB Meter Reading'],
    },
    {
      id: 'internet',
      name: 'WiFi / Internet',
      icon: Wifi,
      color: 'from-cyan-500/20 to-cyan-600/10 text-cyan-300 border-cyan-500/30',
      defaultTitle: 'WiFi Monthly Recharge',
      presets: ['WiFi Monthly Recharge', 'Broadband Fiber Bill', 'Router Upgrade'],
    },
    {
      id: 'maid_cook',
      name: 'Maid & Cook',
      icon: Utensils,
      color: 'from-rose-500/20 to-rose-600/10 text-rose-300 border-rose-500/30',
      defaultTitle: 'Cook & Maid Salary',
      presets: ['Cook & Maid Salary', 'House Maid Monthly', 'Cook Advance'],
    },
    {
      id: 'gas_cylinder',
      name: 'Gas Cylinder',
      icon: Flame,
      color: 'from-orange-500/20 to-orange-600/10 text-orange-300 border-orange-500/30',
      defaultTitle: 'Gas Cylinder Refill',
      presets: ['Gas Cylinder Refill', 'Indane / Bharat Gas', 'Gas Pipe Regulator'],
    },
    {
      id: 'water',
      name: 'Water & Tanker',
      icon: Droplets,
      color: 'from-blue-500/20 to-blue-600/10 text-blue-300 border-blue-500/30',
      defaultTitle: 'Drinking Water 20L Cans',
      presets: ['Drinking Water 20L Cans', 'Water Tanker Supply', 'RO Filter Service'],
    },
    {
      id: 'cleaning',
      name: 'Cleaning & Maid',
      icon: Sparkles,
      color: 'from-teal-500/20 to-teal-600/10 text-teal-300 border-teal-500/30',
      defaultTitle: 'Cleaning & Detergents',
      presets: ['Cleaning & Detergents', 'Floor Cleaner & Mop', 'Bathroom Cleaner & Soap'],
    },
    {
      id: 'groceries',
      name: 'Flat Groceries',
      icon: ShoppingBag,
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-300 border-emerald-500/30',
      defaultTitle: 'Flat Groceries & Supplies',
      presets: ['Flat Groceries & Supplies', 'Cooking Oil & Spices', 'Rice & Provisions'],
    },
    {
      id: 'mess_food',
      name: 'Mess / Common Food',
      icon: Utensils,
      color: 'from-yellow-500/20 to-yellow-600/10 text-yellow-300 border-yellow-500/30',
      defaultTitle: 'Mess Food Purchase',
      presets: ['Mess Food Purchase', 'Daily Vegetables & Milk', 'Common Dinner / Feast'],
    },
    {
      id: 'other',
      name: 'Other Custom',
      icon: Tag,
      color: 'from-purple-500/20 to-purple-600/10 text-purple-300 border-purple-500/30',
      defaultTitle: 'Flat Common Expense',
      presets: ['Flat Common Expense', 'Society Maintenance', 'Plumbing / Electrician Fix'],
    },
  ];

  // Category switch helper
  const handleSelectCategory = (cat: ExpenseCategory) => {
    setCustomCategory(cat);
    const conf = categoriesConfig.find(c => c.id === cat);
    if (conf) {
      setCustomTitle(conf.defaultTitle);
    }
  };

  // --- SAVE RENT HANDLER ---
  const handleSaveRent = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedRentAmount <= 0) {
      alert('Please enter a valid rent amount.');
      return;
    }

    if (rentEligibleMembers.length === 0) {
      alert('Please select at least one roommate to split rent with.');
      return;
    }

    const perPerson = Math.round(perMemberRentShare * 100) / 100;
    const splits: SplitShare[] = rentEligibleMembers.map(m => ({
      memberId: m.id,
      amount: perPerson,
    }));

    // If Month-End Collection: payer is 'room_pool' (so NO single member gets credited +₹16,000 upfront)
    // Everyone owes their equal share at month-end calculation!
    const effectivePayer = rentPaymentModel === 'month_end_pool' ? 'room_pool' : rentPayerId;

    const newExpense: Expense = {
      id: `exp_rent_${Date.now()}`,
      roomId: settings.id,
      title: rentTitle.trim() || 'Monthly Flat Rent',
      amount: totalCalculatedRent,
      category: 'rent',
      paidBy: effectivePayer,
      splitType: 'equal',
      splits,
      date: rentDate,
      notes: rentNotes.trim() || (rentPaymentModel === 'month_end_pool' 
        ? 'Month-End Room Pool Collection (No upfront payer - equal share for all members)' 
        : undefined),
      createdBy: activeMember.id,
      createdAt: new Date().toISOString(),
    };

    onSaveExpense(newExpense);

    // Also update preset rent in settings if user desires auto-continuity
    if (onUpdatePresetRent) {
      onUpdatePresetRent(true, parsedRentAmount, rentType);
    }

    setSuccessToast(
      rentPaymentModel === 'month_end_pool'
        ? `Added Month-End Rent of ${currency}${totalCalculatedRent.toFixed(2)}. Each member owes ${currency}${perPerson.toFixed(2)} at month-end calculation!`
        : `Recorded Flat Rent of ${currency}${totalCalculatedRent.toFixed(2)} paid upfront by ${memberMap.get(rentPayerId)?.name || 'member'}!`
    );
    setTimeout(() => setSuccessToast(null), 4500);
    setRentNotes('');
  };

  // --- ACTIVATE PRESET RENT ONLY ---
  const handleApplyPresetRentOnly = () => {
    if (parsedRentAmount <= 0) {
      alert('Please enter a valid rent amount.');
      return;
    }
    if (onUpdatePresetRent) {
      onUpdatePresetRent(true, parsedRentAmount, rentType);
      setSuccessToast(`Active Room Rent set to ${currency}${parsedRentAmount.toFixed(2)} (${rentType === 'total_room' ? 'Total Flat' : 'Per Member'}). This is automatically added to all member month-end bills!`);
      setTimeout(() => setSuccessToast(null), 4500);
    }
  };

  // --- SAVE CUSTOM EXPENSE HANDLER ---
  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(customAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    const eligible = members.filter(m => customSelectedMembers.includes(m.id));
    if (eligible.length === 0) {
      alert('Please select at least one roommate to split with.');
      return;
    }

    let splits: SplitShare[] = [];
    if (customSplitType === 'exact') {
      splits = members.map(m => ({
        memberId: m.id,
        amount: parseFloat(customExactShares[m.id] || '0') || 0,
      }));
    } else {
      const perPerson = Math.round((amt / eligible.length) * 100) / 100;
      splits = eligible.map(m => ({
        memberId: m.id,
        amount: perPerson,
      }));
    }

    const isMess = customCategory === 'mess_food' || customCategory === 'groceries';

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      roomId: settings.id,
      title: customTitle.trim() || 'Flat Expense',
      amount: amt,
      category: customCategory,
      paidBy: customPayerId,
      splitType: customSplitType,
      splits,
      date: customDate,
      notes: customNotes.trim() || undefined,
      createdBy: activeMember.id,
      createdAt: new Date().toISOString(),
      isMessExpense: isMess,
    };

    onSaveExpense(newExpense);
    setSuccessToast(`Saved "${newExpense.title}" of ${currency}${amt.toFixed(2)} successfully!`);
    setTimeout(() => setSuccessToast(null), 3500);
    setCustomAmount('');
    setCustomNotes('');
  };

  // Toggle member selection in custom split
  const toggleCustomMember = (memberId: string) => {
    if (customSelectedMembers.includes(memberId)) {
      if (customSelectedMembers.length === 1) return; // keep at least 1
      setCustomSelectedMembers(prev => prev.filter(id => id !== memberId));
    } else {
      setCustomSelectedMembers(prev => [...prev, memberId]);
    }
  };

  // Toggle member selection in rent split
  const toggleRentMember = (memberId: string) => {
    if (rentSelectedMembers.includes(memberId)) {
      if (rentSelectedMembers.length === 1) return;
      setRentSelectedMembers(prev => prev.filter(id => id !== memberId));
    } else {
      setRentSelectedMembers(prev => [...prev, memberId]);
    }
  };

  // Filtered Expenses List
  const filteredExpenses = expenses.filter(exp => {
    if (listFilter === 'rent' && exp.category !== 'rent') return false;
    if (listFilter === 'utilities') {
      const utilCats: ExpenseCategory[] = ['electricity', 'internet', 'maid_cook', 'gas_cylinder', 'water'];
      if (!utilCats.includes(exp.category)) return false;
    }
    if (listFilter === 'mess_groceries') {
      if (exp.category !== 'mess_food' && exp.category !== 'groceries') return false;
    }
    if (listFilter === 'other') {
      if (exp.category !== 'cleaning' && exp.category !== 'other' && exp.category !== 'entertainment') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const payerName = exp.paidBy === 'room_pool' ? 'room pool (month-end)' : (memberMap.get(exp.paidBy)?.name.toLowerCase() || '');
      const matchTitle = exp.title.toLowerCase().includes(q);
      const matchPayer = payerName.includes(q);
      const matchCat = exp.category.toLowerCase().includes(q);
      if (!matchTitle && !matchPayer && !matchCat) return false;
    }

    return true;
  });

  const totalRentSpend = expenses.filter(e => e.category === 'rent').reduce((sum, e) => sum + e.amount, 0);
  const totalOtherSpend = expenses.filter(e => e.category !== 'rent').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Header Banner & Quick Action Center */}
      <div className="p-5 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-cyan-950/60 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Add Rent & Expense Manager
              </h2>
              <p className="text-xs text-slate-400">
                Manage month-end room rent pool (no upfront payer) or log utility bills, cook salary, and custom expenses.
              </p>
            </div>
          </div>
        </div>

        {onOpenAddExpenseModal && (
          <button
            onClick={onOpenAddExpenseModal}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md self-start sm:self-auto cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-indigo-400" />
            <span>Open Receipt Scanner</span>
          </button>
        )}
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-3 animate-in fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 2. Primary Mode Selector: Rent vs. Utility & Other Expenses */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/80 rounded-2xl border border-white/10">
        <button
          onClick={() => setExpenseMode('rent')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            expenseMode === 'rent'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>🏢 Add Flat Rent (Equal Month-End Share)</span>
        </button>

        <button
          onClick={() => setExpenseMode('custom')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            expenseMode === 'custom'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>⚡ Add Utility / Any Other Bill</span>
        </button>
      </div>

      {/* 3. FORM A: ADD FLAT RENT BILL */}
      {expenseMode === 'rent' && (
        <div className="p-5 bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-xl space-y-5">
          
          {/* Header & Explanation Card */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white">Month-End Rent Calculation Model</h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold">
                {rentPaymentModel === 'month_end_pool' ? '✨ No Upfront Payer • Month-End Collection' : '👤 Direct Roommate Reimbursement'}
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              <strong>How this works:</strong> Nobody needs to pay rent in advance. The total rent is divided equally among all roommates as a pending payable due. At the end of the month, when all daily mess calculations and utility bills are finished, each roommate's equal rent share is included in their final bill to collect and pay the landlord.
            </p>
          </div>

          {/* Payment Model Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Rent Payment Flow</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRentPaymentModel('month_end_pool')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  rentPaymentModel === 'month_end_pool'
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md'
                    : 'bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Month-End Pool Collection (Default)
                  </span>
                  {rentPaymentModel === 'month_end_pool' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  No one pays now. Goes equally to all members as month-end payable dues.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRentPaymentModel('upfront_member')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  rentPaymentModel === 'upfront_member'
                    ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-md'
                    : 'bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    Paid Upfront by a Roommate
                  </span>
                  {rentPaymentModel === 'upfront_member' && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  A specific member transferred rent out-of-pocket to the landlord.
                </p>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveRent} className="space-y-4">
            
            {/* Rent Amount & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Total Rent Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    {rentType === 'total_room' ? 'Total Flat Rent' : 'Rent Per Member'} ({currency})
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setRentType('total_room')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        rentType === 'total_room' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      Total Flat
                    </button>
                    <button
                      type="button"
                      onClick={() => setRentType('per_member')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        rentType === 'per_member' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      Per Member
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    placeholder={rentType === 'total_room' ? 'e.g. 16000' : 'e.g. 4000'}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Bill Title / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Bill Title / Month Label</label>
                <input
                  type="text"
                  value={rentTitle}
                  onChange={(e) => setRentTitle(e.target.value)}
                  placeholder="e.g. August Flat Rent"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Payer field (conditional) */}
              {rentPaymentModel === 'upfront_member' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Paid By (Who transferred to Landlord)</label>
                  <select
                    value={rentPayerId}
                    onChange={(e) => setRentPayerId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role.toUpperCase()}) {m.id === activeMember.id ? '— (YOU)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Payment Status</label>
                  <div className="w-full bg-slate-950/80 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300 flex items-center gap-2 font-mono font-bold">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Accrued to Room Pool (Collected at month end)</span>
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Date / Billing Cycle</label>
                <input
                  type="date"
                  value={rentDate}
                  onChange={(e) => setRentDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                />
              </div>
            </div>

            {/* LIVE SHARE CALCULATION PREVIEW BOX */}
            <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Equal Roommate Share Breakdown</span>
                </span>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRentSplitType('all_rent_eligible')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      rentSplitType === 'all_rent_eligible'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    All Eligible ({members.filter(m => m.membershipType !== 'mess_only').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentSplitType('selected_members')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      rentSplitType === 'selected_members'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Custom Selection
                  </button>
                </div>
              </div>

              {/* Prominent Per-Member Share Banner */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-300 font-semibold block">
                    Per Member Equal Rent Due (at month-end):
                  </span>
                  <span className="text-lg font-mono font-black text-white">
                    {currency}{perMemberRentShare.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {rentEligibleMembers.length} roommates sharing {currency}{totalCalculatedRent.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    Added to each member's monthly statement
                  </span>
                </div>
              </div>

              {/* Roommate Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {members.map(m => {
                  const isEligible = m.membershipType !== 'mess_only';
                  const isChecked = rentSplitType === 'all_rent_eligible' ? isEligible : rentSelectedMembers.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      onClick={() => rentSplitType === 'selected_members' && toggleRentMember(m.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                          : 'bg-slate-900 border-white/5 text-slate-500 opacity-60'
                      } ${rentSplitType === 'selected_members' ? 'cursor-pointer hover:border-emerald-500/60' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={rentSplitType === 'all_rent_eligible'}
                          onChange={() => toggleRentMember(m.id)}
                          className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-800 border-white/20"
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold block truncate">{m.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {m.membershipType === 'mess_only' ? 'Mess only' : 'Rent eligible'}
                          </span>
                        </div>
                      </div>

                      {isChecked && parsedRentAmount > 0 && (
                        <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                          {currency}{perMemberRentShare.toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Notes / Remarks (Optional)</label>
              <input
                type="text"
                value={rentNotes}
                onChange={(e) => setRentNotes(e.target.value)}
                placeholder="e.g. Due to landlord on 1st after month-end calculation"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Dual Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="submit"
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>Save Month-End Rent ({currency}{totalCalculatedRent.toFixed(2)})</span>
              </button>

              <button
                type="button"
                onClick={handleApplyPresetRentOnly}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-emerald-500/40 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Set as Active Room Rent Rule</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. FORM B: ADD UTILITY & CUSTOM FLAT EXPENSE */}
      {expenseMode === 'custom' && (
        <div className="p-5 bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Record Utility & Custom Room Bills</h3>
            </div>
            <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
              Admin Direct Entry
            </span>
          </div>

          {/* 1. Category Grid */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Bill Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {categoriesConfig.map(cat => {
                const Icon = cat.icon;
                const isSelected = customCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? `bg-gradient-to-r ${cat.color} font-bold shadow-md border-indigo-400 text-white`
                        : 'bg-slate-950 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                    <span className="text-xs truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Quick Suggestions for Active Category */}
          {(() => {
            const activeConf = categoriesConfig.find(c => c.id === customCategory);
            if (!activeConf) return null;

            return (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Preset Suggestions</label>
                <div className="flex flex-wrap gap-2">
                  {activeConf.presets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomTitle(preset)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        customTitle === preset
                          ? 'bg-indigo-500 text-white border-indigo-400 font-bold'
                          : 'bg-slate-950 text-slate-300 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Form Fields */}
          <form onSubmit={handleSaveCustom} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Expense Title / Description</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. July Electricity Bill"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Amount ({currency})</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="e.g. 1450.00"
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Paid By */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Paid By (Who Paid)</label>
                <select
                  value={customPayerId}
                  onChange={(e) => setCustomPayerId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === activeMember.id ? '— (YOU)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Date of Expense</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
                />
              </div>
            </div>

            {/* Split Type Selector */}
            <div className="p-4 bg-slate-950 rounded-xl border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Split Type & Roommate Allocation:</span>
                </label>

                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSplitType('equal');
                      setCustomSelectedMembers(members.map(m => m.id));
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      customSplitType === 'equal' && customSelectedMembers.length === members.length
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Equal All ({members.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomSplitType('exact')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      customSplitType === 'exact'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Exact Shares
                  </button>
                </div>
              </div>

              {/* Roommate Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {members.map(m => {
                  const isChecked = customSelectedMembers.includes(m.id);
                  const shareAmt = (parseFloat(customAmount) || 0) / (customSelectedMembers.length || 1);

                  return (
                    <div
                      key={m.id}
                      onClick={() => customSplitType !== 'exact' && toggleCustomMember(m.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        isChecked
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                          : 'bg-slate-900 border-white/5 text-slate-500 opacity-60'
                      } ${customSplitType !== 'exact' ? 'cursor-pointer hover:border-indigo-500/60' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {customSplitType !== 'exact' && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCustomMember(m.id)}
                            className="w-3.5 h-3.5 rounded text-indigo-500 bg-slate-800 border-white/20"
                          />
                        )}
                        <span className="text-xs font-bold truncate">{m.name}</span>
                      </div>

                      {customSplitType === 'exact' ? (
                        <div className="relative w-20">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                            {currency}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={customExactShares[m.id] || ''}
                            onChange={(e) => setCustomExactShares(prev => ({ ...prev, [m.id]: e.target.value }))}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-white/10 rounded px-1.5 pl-4 py-1 text-[11px] font-mono text-white text-right focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ) : (
                        isChecked && parseFloat(customAmount) > 0 && (
                          <span className="text-xs font-mono font-bold text-indigo-400 shrink-0">
                            {currency}{shareAmt.toFixed(2)}
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Notes / Remarks (Optional)</label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Consumer #123456 / Due on 15th"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Save & Record Expense ({currency}{parseFloat(customAmount) ? parseFloat(customAmount).toFixed(2) : '0.00'})</span>
            </button>
          </form>
        </div>
      )}

      {/* 5. LOGGED EXPENSES & RENT LIST (ADMIN VIEW & DELETE) */}
      <div className="p-5 bg-slate-900 border border-white/10 rounded-2xl shadow-xl space-y-4">
        
        {/* Header and Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-400" />
              <span>Admin Expenses Log & Rent Records</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                {filteredExpenses.length} bills
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rent Total: <strong className="text-emerald-400">{currency}{totalRentSpend.toFixed(2)}</strong> • Other Bills: <strong className="text-indigo-400">{currency}{totalOtherSpend.toFixed(2)}</strong>
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill or payer..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Bills' },
            { id: 'rent', label: '🏢 Rent Only' },
            { id: 'utilities', label: '⚡ Utilities (Power, WiFi, Maid)' },
            { id: 'mess_groceries', label: '🍲 Mess & Groceries' },
            { id: 'other', label: '🧹 Cleaning & Other' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setListFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                listFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No expenses found matching the selected filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredExpenses.map(exp => {
              const isRent = exp.category === 'rent';
              const isRoomPool = exp.paidBy === 'room_pool';
              const payerName = isRoomPool ? 'Month-End Room Pool (No upfront payer)' : (memberMap.get(exp.paidBy)?.name || 'Unknown');

              return (
                <div key={exp.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${
                      isRent 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    }`}>
                      {isRent ? <Home className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{exp.title}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                          isRent 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {exp.category.replace('_', ' ')}
                        </span>
                        {isRoomPool && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            Month-End Pool
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>Payer: <strong className={isRoomPool ? 'text-amber-300' : 'text-slate-200'}>{payerName}</strong></span>
                        <span>•</span>
                        <span>Date: {exp.date}</span>
                        <span>•</span>
                        <span>Split: {exp.splits.length} members ({currency}{(exp.amount / (exp.splits.length || 1)).toFixed(2)}/ea)</span>
                      </div>

                      {exp.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          "{exp.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right font-mono">
                      <div className="text-sm sm:text-base font-black text-white">
                        {currency}{exp.amount.toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={() => setDeleteConfirmExpense(exp)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                      title="Delete this expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Expense Confirm Dialog */}
      {deleteConfirmExpense && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Recorded Expense"
          message={`Are you sure you want to delete "${deleteConfirmExpense.title}" (${currency}${deleteConfirmExpense.amount.toFixed(2)})? This will automatically recalculate all roommate balances.`}
          confirmLabel="Delete Expense"
          confirmVariant="danger"
          onConfirm={() => {
            onDeleteExpense(deleteConfirmExpense.id);
            setDeleteConfirmExpense(null);
            setSuccessToast(`Deleted "${deleteConfirmExpense.title}" successfully.`);
            setTimeout(() => setSuccessToast(null), 3000);
          }}
          onCancel={() => setDeleteConfirmExpense(null)}
        />
      )}

    </div>
  );
};
