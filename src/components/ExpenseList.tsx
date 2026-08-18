import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Receipt, 
  Utensils, 
  Zap, 
  Wifi, 
  Home, 
  Flame, 
  Droplet, 
  Sparkles, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  User,
  Users,
  Plus,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  X,
  ArrowUpDown,
  ArrowDownAZ,
  Layers,
  List
} from 'lucide-react';
import { Expense, Member, RoomSettings, ExpenseCategory } from '../types';
import { BillScannerModal } from './BillScannerModal';
import { ConfirmDialog } from './ConfirmDialog';

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  activeMember: Member;
  settings: RoomSettings;
  onOpenAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddExpenseDirect?: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
}

export type ExpenseSortOption = 
  | 'date_desc' 
  | 'date_asc' 
  | 'member_asc' 
  | 'amount_desc' 
  | 'amount_asc';

const CATEGORY_ICONS: Record<ExpenseCategory, any> = {
  groceries: Utensils,
  mess_food: Utensils,
  electricity: Zap,
  rent: Home,
  internet: Wifi,
  gas_cylinder: Flame,
  maid_cook: User,
  water: Droplet,
  cleaning: Sparkles,
  entertainment: Sparkles,
  other: Receipt,
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  groceries: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  mess_food: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  electricity: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  rent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  internet: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  gas_cylinder: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  maid_cook: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  water: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  cleaning: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  entertainment: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  other: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
};

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  members,
  activeMember,
  settings,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAddExpenseDirect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [sortBy, setSortBy] = useState<ExpenseSortOption>('date_desc');
  const [viewLayout, setViewLayout] = useState<'flat' | 'grouped_by_member'>('flat');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const memberMap = useMemo(() => new Map<string, Member>(members.map(m => [m.id, m])), [members]);

  // Filter and Sort Expenses
  const processedExpenses = useMemo(() => {
    // 1. Filtering
    const filtered = expenses.filter((exp) => {
      const matchesSearch = 
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (memberMap.get(exp.paidBy)?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
      const matchesMember = selectedMember === 'all' || exp.paidBy === selectedMember;

      return matchesSearch && matchesCategory && matchesMember;
    });

    // 2. Sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'member_asc') {
        const nameA = memberMap.get(a.paidBy)?.name || '';
        const nameB = memberMap.get(b.paidBy)?.name || '';
        const comp = nameA.localeCompare(nameB);
        if (comp !== 0) return comp;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [expenses, searchQuery, selectedCategory, selectedMember, sortBy, memberMap]);

  // Grouped by member summary
  const groupedByMember = useMemo(() => {
    const map = new Map<string, { member: Member; expenses: Expense[]; total: number }>();
    
    // Initialize for all relevant members
    members.forEach(m => {
      map.set(m.id, { member: m, expenses: [], total: 0 });
    });

    processedExpenses.forEach(exp => {
      const entry = map.get(exp.paidBy);
      if (entry) {
        entry.expenses.push(exp);
        entry.total += exp.amount;
      } else {
        const fallbackMember = memberMap.get(exp.paidBy) || {
          id: exp.paidBy,
          name: 'Unknown Member',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50',
          email: '',
          role: 'member',
          permissions: {} as any,
          joinedAt: '',
          isMessActive: true,
          depositBalance: 0,
        };
        map.set(exp.paidBy, { member: fallbackMember, expenses: [exp], total: exp.amount });
      }
    });

    return Array.from(map.values()).filter(group => group.expenses.length > 0 || selectedMember === group.member.id);
  }, [processedExpenses, members, memberMap, selectedMember]);

  const totalFilteredAmount = processedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const canEditOrDelete = (exp: Expense) => {
    const isOwner = exp.paidBy === activeMember.id || exp.createdBy === activeMember.id;
    const isAdmin = activeMember.role === 'super_admin' || activeMember.role === 'admin';
    const hasPermission = activeMember.permissions.canEditAnyExpense;
    return isOwner || isAdmin || hasPermission;
  };

  const handleScanDirect = (scannedData: {
    title: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
    receiptUrl: string;
    isMessExpense: boolean;
  }) => {
    if (onAddExpenseDirect) {
      const activeTargets = scannedData.category === 'rent'
        ? members.filter(m => m.membershipType !== 'mess_only')
        : (scannedData.isMessExpense 
            ? members.filter(m => m.membershipType !== 'rent_only')
            : members);

      const targetMembers = activeTargets.length > 0 ? activeTargets : members;
      const equalShare = Math.round((scannedData.amount / targetMembers.length) * 100) / 100;
      
      const splits = targetMembers.map((m, idx) => ({
        memberId: m.id,
        amount: idx === targetMembers.length - 1 
          ? Math.round((scannedData.amount - equalShare * (targetMembers.length - 1)) * 100) / 100
          : equalShare,
      }));

      onAddExpenseDirect({
        roomId: settings.id,
        title: scannedData.title,
        amount: scannedData.amount,
        category: scannedData.category,
        paidBy: activeMember.id,
        splitType: 'equal',
        splits,
        date: new Date(scannedData.date).toISOString(),
        receiptUrl: scannedData.receiptUrl,
        autoScanned: true,
        createdBy: activeMember.id,
        isMessExpense: scannedData.isMessExpense,
      });
    } else {
      onOpenAddExpense();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card: Summary & Controls */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Purchases & Expenses
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {processedExpenses.length} bills
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Filtered Total: <span className="text-emerald-400 font-bold">{settings.currencySymbol}{totalFilteredAmount.toFixed(2)}</span>
            </p>
          </div>

          {/* Quick Add & Auto-Scan Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>Auto-Scan Bill</span>
            </button>

            <button
              onClick={onOpenAddExpense}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Purchase</span>
            </button>
          </div>
        </div>

        {/* Search, Sort & Member Filter Bar */}
        <div className="space-y-3 pt-3 border-t border-white/5">
          
          {/* Row 1: Search Input and Sort & Layout Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Search bar */}
            <div className="relative sm:col-span-6">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, note, or member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Control Dropdown (Requirement 1: Sort by Member & Added Date) */}
            <div className="sm:col-span-4 flex items-center bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 mr-2 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ExpenseSortOption)}
                className="w-full bg-transparent text-xs text-slate-200 font-medium outline-none cursor-pointer"
                title="Sort purchases by added date, member, or amount"
              >
                <option value="date_desc" className="bg-slate-900 text-white">📅 Added Date (Newest First)</option>
                <option value="date_asc" className="bg-slate-900 text-white">📅 Added Date (Oldest First)</option>
                <option value="member_asc" className="bg-slate-900 text-white">👤 Member / Payer (A to Z)</option>
                <option value="amount_desc" className="bg-slate-900 text-white">💰 Amount (Highest First)</option>
                <option value="amount_asc" className="bg-slate-900 text-white">💰 Amount (Lowest First)</option>
              </select>
            </div>

            {/* Layout Toggle: Flat List vs Grouped by Member */}
            <div className="sm:col-span-2 flex items-center gap-1 bg-slate-950 border border-white/10 rounded-xl p-1 justify-end">
              <button
                type="button"
                onClick={() => setViewLayout('flat')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                  viewLayout === 'flat' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="View individual list"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewLayout('grouped_by_member');
                  setSortBy('member_asc');
                }}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                  viewLayout === 'grouped_by_member' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Group purchases by member"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Members</span>
              </button>
            </div>
          </div>

          {/* Row 2: Roommate Payer Quick Filter Chips */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Filter By Roommate:</span>
              {selectedMember !== 'all' && (
                <button
                  onClick={() => setSelectedMember('all')}
                  className="text-indigo-400 hover:text-indigo-300 font-mono text-[10px]"
                >
                  Clear Member Filter
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setSelectedMember('all')}
                className={`px-3 py-1 rounded-xl whitespace-nowrap text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                  selectedMember === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-white/10 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>All Roommates ({expenses.length})</span>
              </button>

              {members.map((m) => {
                const count = expenses.filter(e => e.paidBy === m.id).length;
                const memberTotal = expenses.filter(e => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0);

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(selectedMember === m.id ? 'all' : m.id)}
                    className={`px-3 py-1 rounded-xl whitespace-nowrap text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                      selectedMember === m.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-950/60 text-slate-400 border-white/10 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <img 
                      src={m.avatar} 
                      alt={m.name} 
                      className="w-4 h-4 rounded-full object-cover border border-white/20" 
                    />
                    <span>{m.name.split(' ')[0]}</span>
                    <span className="font-mono text-[10px] opacity-80">({count} • {settings.currencySymbol}{memberTotal.toFixed(0)})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Fast Category Filter Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400 block">
              Filter By Category:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'mess_food', label: 'Mess Food' },
                { id: 'groceries', label: 'Groceries' },
                { id: 'rent', label: 'Room Rent' },
                { id: 'electricity', label: 'Electricity' },
                { id: 'internet', label: 'Wi-Fi' },
                { id: 'gas_cylinder', label: 'Gas' },
                { id: 'maid_cook', label: 'Cook' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-xl whitespace-nowrap text-[11px] font-semibold border transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-white/10 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Active Sort Banner Indicator */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            Sorted by:{' '}
            <strong className="text-slate-200">
              {sortBy === 'date_desc' && 'Added Date (Newest)'}
              {sortBy === 'date_asc' && 'Added Date (Oldest)'}
              {sortBy === 'member_asc' && 'Member / Roommate (A-Z)'}
              {sortBy === 'amount_desc' && 'Amount (Highest to Lowest)'}
              {sortBy === 'amount_asc' && 'Amount (Lowest to Highest)'}
            </strong>
          </span>
        </span>
        <span>
          Showing {processedExpenses.length} of {expenses.length} purchases
        </span>
      </div>

      {/* Expenses Feed */}
      {processedExpenses.length === 0 ? (
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Purchases Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all' || selectedMember !== 'all'
              ? 'No bills match your active search, member, or category filters.' 
              : 'Start logging purchases for groceries, flat rent, or mess meals.'}
          </p>
          <button
            onClick={onOpenAddExpense}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Purchase</span>
          </button>
        </div>
      ) : viewLayout === 'grouped_by_member' ? (
        /* Grouped by Member View Layout */
        <div className="space-y-4">
          {groupedByMember.map(({ member, expenses: memberExpenses, total }) => (
            <div key={member.id} className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              
              {/* Member Group Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <img 
                    src={member.avatar} 
                    alt={member.name} 
                    className="w-10 h-10 rounded-2xl object-cover border-2 border-indigo-400/50 shadow" 
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{member.name}</h3>
                      {member.id === activeMember.id && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {memberExpenses.length} {memberExpenses.length === 1 ? 'purchase' : 'purchases'} logged
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Total Paid</span>
                  <span className="text-base font-black text-white font-mono">
                    {settings.currencySymbol}{total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Member's Expense Items */}
              <div className="space-y-2">
                {memberExpenses.map((expense) => {
                  const CategoryIcon = CATEGORY_ICONS[expense.category] || Receipt;
                  const categoryColor = CATEGORY_COLORS[expense.category] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
                  const isExpanded = expandedExpenseId === expense.id;

                  return (
                    <div 
                      key={expense.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-white/5 hover:border-indigo-500/30 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-lg border shrink-0 ${categoryColor}`}>
                            <CategoryIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-white block truncate">{expense.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              {expense.isMessExpense && <span className="text-amber-400 font-semibold">• Mess Bill</span>}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-bold text-sm text-white">
                            {settings.currencySymbol}{expense.amount.toFixed(2)}
                          </span>
                          
                          {canEditOrDelete(expense) && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onEditExpense(expense)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-400"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setExpenseToDelete(expense)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      ) : (
        /* Flat List View Layout */
        <div className="space-y-2.5">
          {processedExpenses.map((expense) => {
            const payer = memberMap.get(expense.paidBy);
            const isExpanded = expandedExpenseId === expense.id;
            const CategoryIcon = CATEGORY_ICONS[expense.category] || Receipt;
            const categoryColor = CATEGORY_COLORS[expense.category] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';

            return (
              <div 
                key={expense.id}
                className="bg-slate-900 border border-white/10 rounded-2xl p-4 hover:border-indigo-500/30 transition-all shadow-sm space-y-3"
              >
                {/* Primary Card Row */}
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Category Icon + Title + Meta */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${categoryColor}`}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">
                          {expense.title}
                        </h4>
                        {expense.autoScanned && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Auto-Scanned
                          </span>
                        )}
                        {expense.isMessExpense && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Mess Bill
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <img 
                            src={payer?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'} 
                            alt={payer?.name || 'Payer'} 
                            className="w-3.5 h-3.5 rounded-full object-cover" 
                          />
                          Paid by <strong className="text-slate-300 font-medium">{payer?.name || 'Roommate'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Expand Toggle */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-white font-mono">
                      {settings.currencySymbol}{expense.amount.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {expense.splits.length} {expense.splits.length === 1 ? 'member' : 'members'} split
                    </span>
                  </div>
                </div>

                {/* Optional Notes or Receipt Preview Pill */}
                {(expense.notes || expense.receiptUrl) && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                    {expense.notes ? (
                      <p className="text-[11px] text-slate-400 italic truncate">
                        "{expense.notes}"
                      </p>
                    ) : <span />}

                    {expense.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => setViewReceiptUrl(expense.receiptUrl || null)}
                        className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <ImageIcon className="w-3 h-3" /> View Bill
                      </button>
                    )}
                  </div>
                )}

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <button
                    onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-medium"
                  >
                    <span>{isExpanded ? 'Hide Split Details' : 'View Split Breakdown'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {canEditOrDelete(expense) && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditExpense(expense)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                        title="Edit Purchase"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setExpenseToDelete(expense)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                        title="Delete Purchase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Split Breakdown */}
                {isExpanded && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-2 animate-in fade-in">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Roommate Share Breakdown</span>
                      <span className="font-mono text-indigo-400 capitalize">{expense.splitType.replace('_', ' ')}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {expense.splits.map((split) => {
                        const m = memberMap.get(split.memberId);
                        return (
                          <div 
                            key={split.memberId}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-white/5 text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <img 
                                src={m?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'} 
                                alt={m?.name} 
                                className="w-5 h-5 rounded-full object-cover" 
                              />
                              <span className="text-slate-300 font-medium truncate">{m?.name || 'Roommate'}</span>
                            </div>
                            <span className="font-mono font-bold text-white">
                              {settings.currencySymbol}{split.amount.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Bill Scanner Modal for Quick Scanning */}
      <BillScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        currencySymbol={settings.currencySymbol}
        onScanComplete={handleScanDirect}
      />

      {/* Bill Receipt Lightbox Preview Modal */}
      {viewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" /> Attached Bill Receipt
              </span>
              <button
                onClick={() => setViewReceiptUrl(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[75vh]">
              <img 
                src={viewReceiptUrl} 
                alt="Receipt Full View" 
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense In-App Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!expenseToDelete}
        title="Delete Expense Entry?"
        message={`Are you sure you want to permanently delete "${expenseToDelete?.title}" (${settings.currencySymbol}${expenseToDelete?.amount.toFixed(2)})? This will recalculate all roommate split shares and net balances.`}
        confirmLabel="Yes, Delete Bill"
        cancelLabel="Keep Expense"
        variant="danger"
        iconType="trash"
        onConfirm={() => {
          if (expenseToDelete) {
            onDeleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
};
