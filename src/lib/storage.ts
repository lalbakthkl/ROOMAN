import { 
  RoomData, 
  RoomSettings,
  Member, 
  Expense, 
  DailyMealEntry, 
  Settlement, 
  AuditLog, 
  SimplifiedDebt, 
  Role, 
  MemberPermissions,
  MonthlySnapshot,
  MemberMonthlyBreakdown
} from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'roomex_room_data_v1';
const ACTIVE_MEMBER_KEY = 'roomex_active_member_id';

export const DEFAULT_PERMISSIONS: Record<Role, MemberPermissions> = {
  super_admin: {
    canAddExpense: true,
    canEditAnyExpense: true,
    canDeleteExpense: true,
    canManageMeals: true,
    canSettleDebts: true,
    canInviteMembers: true,
    canGrantAdmin: true,
    canEditRoomSettings: true,
  },
  admin: {
    canAddExpense: true,
    canEditAnyExpense: true,
    canDeleteExpense: true,
    canManageMeals: true,
    canSettleDebts: true,
    canInviteMembers: true,
    canGrantAdmin: true,
    canEditRoomSettings: true,
  },
  co_admin: {
    canAddExpense: true,
    canEditAnyExpense: true,
    canDeleteExpense: false,
    canManageMeals: true,
    canSettleDebts: true,
    canInviteMembers: true,
    canGrantAdmin: false,
    canEditRoomSettings: false,
  },
  member: {
    canAddExpense: true,
    canEditAnyExpense: false,
    canDeleteExpense: false,
    canManageMeals: true,
    canSettleDebts: true,
    canInviteMembers: false,
    canGrantAdmin: false,
    canEditRoomSettings: false,
  },
};

export const INITIAL_ROOM_DATA: RoomData = {
  settings: {
    id: 'room_initial',
    name: 'Our Flat',
    currency: 'INR',
    currencySymbol: '₹',
    monthlyBudget: 0,
    isMessEnabled: true,
    messCalculationMode: 'dynamic_ratio',
    messCalculationType: 'days_stayed',
    daysInMonth: 30,
    fixedMealRate: 0,
    roomCode: '',
    createdById: '',
    createdAt: new Date().toISOString(),
  },
  members: [],
  expenses: [],
  meals: [],
  settlements: [],
  auditLogs: [],
  cleaningSchedule: {
    currentMemberId: '',
    nextMemberId: '',
    dutyDate: new Date().toISOString().split('T')[0],
    dutyArea: 'Full Flat / Apartment',
    assignedDuties: {},
    rotaOrder: [],
    frequency: 'daily',
  },
  cleaningHistory: [],
  monthlyArchives: [],
};

// Local storage reader/writer
export function loadRoomData(): RoomData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If legacy sample mock data detected, clear it
      if (parsed?.settings?.id === 'room_skyline_402' || parsed?.members?.some((m: any) => m.name === 'Alex Rivera' || m.name === 'Brian Chen')) {
        localStorage.removeItem(STORAGE_KEY);
        return INITIAL_ROOM_DATA;
      }
      if (parsed && parsed.settings && Array.isArray(parsed.members)) {
        // Ensure backwards compatibility with newly added fields
        if (!parsed.cleaningSchedule) {
          parsed.cleaningSchedule = INITIAL_ROOM_DATA.cleaningSchedule;
        }
        if (!parsed.cleaningHistory) {
          parsed.cleaningHistory = [];
        }
        if (!parsed.monthlyArchives) {
          parsed.monthlyArchives = [];
        }
        parsed.members = parsed.members.map((m: Member) => ({
          ...m,
          membershipType: m.membershipType || (m.isMessActive ? 'both' : 'rent_only'),
          daysStayed: m.daysStayed !== undefined ? m.daysStayed : (parsed.settings.daysInMonth || 30),
        }));
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored room data, using clean initial data', e);
  }
  return INITIAL_ROOM_DATA;
}

export function saveRoomData(data: RoomData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save room data to localStorage', e);
  }
}

export function getActiveMemberId(members: Member[]): string {
  try {
    const saved = localStorage.getItem(ACTIVE_MEMBER_KEY);
    if (saved && members.some(m => m.id === saved)) {
      return saved;
    }
  } catch {}
  return members[0]?.id || 'member_1';
}

export function setActiveMemberId(memberId: string): void {
  try {
    localStorage.setItem(ACTIVE_MEMBER_KEY, memberId);
  } catch {}
}

// Calculate Member Rent Share (Equal Split by default or Manual Custom Override)
export function calculateMemberRentShare(
  memberId: string,
  members: Member[],
  settings?: RoomSettings,
  expenses: Expense[] = []
): number {
  const member = members.find(m => m.id === memberId);
  if (!member || member.membershipType === 'mess_only') {
    return 0;
  }

  // 1. Manual Custom Rent Override (if set by admin)
  if (member.customRentShare !== undefined && member.customRentShare > 0) {
    return Math.round(member.customRentShare * 100) / 100;
  }

  // 2. Room Preset Rent (Equal split or flat per member)
  if (settings?.presetRentActive && settings.presetRentAmount && settings.presetRentAmount > 0) {
    if (settings.presetRentType === 'per_member') {
      return Math.round(settings.presetRentAmount * 100) / 100;
    }
    // 'total_room' default equal split:
    // Subtract any members with customRentShare from the total room rent,
    // and distribute the remaining rent equally among the remaining rent-eligible members
    const rentEligibleMembers = members.filter(m => m.membershipType !== 'mess_only');
    const customRentSum = rentEligibleMembers.reduce((sum, m) => {
      return sum + (m.customRentShare !== undefined && m.customRentShare > 0 ? m.customRentShare : 0);
    }, 0);
    const standardMembers = rentEligibleMembers.filter(m => !(m.customRentShare !== undefined && m.customRentShare > 0));
    
    if (standardMembers.some(m => m.id === memberId)) {
      const remainingTotal = Math.max(0, settings.presetRentAmount - customRentSum);
      const equalShare = standardMembers.length > 0 ? remainingTotal / standardMembers.length : 0;
      return Math.round(equalShare * 100) / 100;
    }
  }

  // 3. Fallback to logged 'rent' category expenses
  const expenseRentShare = expenses
    .filter(e => e.category === 'rent')
    .reduce((sum, e) => {
      const split = e.splits.find(s => s.memberId === memberId);
      return sum + (split ? split.amount : 0);
    }, 0);

  return Math.round(expenseRentShare * 100) / 100;
}

// Calculate Net Balances for each member
// Positive (+): Room owes this member money (they overpaid)
// Negative (-): Member owes money to the room
export function calculateNetBalances(
  members: Member[], 
  expenses: Expense[], 
  settlements: Settlement[],
  settings?: RoomSettings
): Record<string, number> {
  const balances: Record<string, number> = {};
  members.forEach(m => {
    balances[m.id] = 0;
  });

  // 1. Process Expenses
  expenses.forEach(exp => {
    const payerId = exp.paidBy;
    if (balances[payerId] !== undefined) {
      balances[payerId] += exp.amount;
    }

    // Deduct each member's share
    exp.splits.forEach(split => {
      if (balances[split.memberId] !== undefined) {
        balances[split.memberId] -= split.amount;
      }
    });
  });

  // 2. Preset Rent Integration (if active and not already logged as expense)
  const hasRentExpense = expenses.some(e => e.category === 'rent');
  if (settings?.presetRentActive && settings.presetRentAmount && settings.presetRentAmount > 0 && !hasRentExpense) {
    members.forEach(m => {
      const rentShare = calculateMemberRentShare(m.id, members, settings, expenses);
      if (balances[m.id] !== undefined) {
        balances[m.id] -= rentShare;
      }
    });
  }

  // 3. Process Settlements
  settlements.forEach(set => {
    // fromMember paid to toMember
    // fromMember balance goes up (debt reduced)
    // toMember balance goes down (received money)
    if (balances[set.fromMemberId] !== undefined) {
      balances[set.fromMemberId] += set.amount;
    }
    if (balances[set.toMemberId] !== undefined) {
      balances[set.toMemberId] -= set.amount;
    }
  });

  // Round to 2 decimal places to avoid floating point imprecisions
  for (const k in balances) {
    balances[k] = Math.round(balances[k] * 100) / 100;
  }

  return balances;
}

// Debt Simplification Algorithm (Greedy minimum transactions)
export function simplifyDebts(
  members: Member[], 
  expenses: Expense[], 
  settlements: Settlement[],
  settings?: RoomSettings
): SimplifiedDebt[] {
  const balances = calculateNetBalances(members, expenses, settlements, settings);

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [memberId, balance] of Object.entries(balances)) {
    if (balance < -0.01) {
      debtors.push({ id: memberId, amount: -balance });
    } else if (balance > 0.01) {
      creditors.push({ id: memberId, amount: balance });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedDebt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0.01) {
      transactions.push({
        fromMemberId: debtor.id,
        toMemberId: creditor.id,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  return transactions;
}

// Calculate Total Meals for a member across all daily meal entries
export function calculateMemberMeals(
  memberId: string, 
  meals: DailyMealEntry[]
): {
  breakfast: number;
  lunch: number;
  dinner: number;
  guest: number;
  total: number;
} {
  let breakfast = 0;
  let lunch = 0;
  let dinner = 0;
  let guest = 0;

  meals.forEach(m => {
    breakfast += m.breakfastCount[memberId] || 0;
    lunch += m.lunchCount[memberId] || 0;
    dinner += m.dinnerCount[memberId] || 0;
    guest += m.guestMeals[memberId] || 0;
  });

  return {
    breakfast,
    lunch,
    dinner,
    guest,
    total: breakfast + lunch + dinner + guest,
  };
}

// Calculate Mess Metrics (Exact User Formula: Total Mess Purchase ÷ Total Member Stayed Days = Per Day Rate, Member Mess Bill = Per Day Rate × Member Stayed Days)
export function calculateMessMetrics(
  expenses: Expense[], 
  meals: DailyMealEntry[], 
  members: Member[],
  daysInMonth: number = 30
): {
  totalMessExpense: number;
  daysInMonth: number;
  totalMemberStayedDays: number;
  dailyMessRate: number;
  totalMealsConsumed: number;
  effectiveMealRate: number;
  memberDaysBreakdown: Record<string, { daysStayed: number; cost: number; formula: string }>;
  memberMealBreakdown: Record<string, { mealCount: number; cost: number }>;
} {
  const messExpenses = expenses.filter(e => e.isMessExpense || e.category === 'mess_food' || e.category === 'groceries' || e.category === 'gas_cylinder');
  const totalMessExpense = messExpenses.reduce((sum, e) => sum + e.amount, 0);

  const validDaysInMonth = Math.max(1, daysInMonth || 30);

  // Calculate total member-stayed days across all mess-active members
  const messMembers = members.filter(m => m.membershipType !== 'rent_only' && m.isMessActive !== false);
  const totalMemberStayedDays = messMembers.reduce((sum, m) => {
    const memberDays = m.daysStayed !== undefined ? m.daysStayed : (m.daysStayedInMonth ?? validDaysInMonth);
    return sum + Math.max(0, memberDays);
  }, 0);

  // Per Day Rate = Total Mess Purchase ÷ Total Member Stayed Days
  const dailyMessRate = totalMemberStayedDays > 0 
    ? Math.round((totalMessExpense / totalMemberStayedDays) * 100) / 100 
    : (validDaysInMonth > 0 ? Math.round((totalMessExpense / validDaysInMonth) * 100) / 100 : 0);

  // 1. Days Stayed Breakdown: Per Day Rate × Member Stayed Days
  const memberDaysBreakdown: Record<string, { daysStayed: number; cost: number; formula: string }> = {};
  members.forEach(m => {
    const isRentOnly = m.membershipType === 'rent_only' || m.isMessActive === false;
    const memberDays = m.daysStayed !== undefined ? m.daysStayed : (m.daysStayedInMonth ?? validDaysInMonth);
    
    if (isRentOnly) {
      memberDaysBreakdown[m.id] = {
        daysStayed: memberDays,
        cost: 0,
        formula: 'Rent Only (Mess Bill = 0.00)',
      };
    } else {
      const cost = Math.round((dailyMessRate * memberDays) * 100) / 100;
      memberDaysBreakdown[m.id] = {
        daysStayed: memberDays,
        cost,
        formula: totalMemberStayedDays > 0 
          ? `(${totalMessExpense.toFixed(2)} total purchase ÷ ${totalMemberStayedDays} total stayed days) × ${memberDays} days = ${cost.toFixed(2)}`
          : `(${totalMessExpense.toFixed(2)} ÷ ${validDaysInMonth}) × ${memberDays} days = ${cost.toFixed(2)}`,
      };
    }
  });

  // 2. Meal Attendance Breakdown (Alternative counter)
  let totalMealsConsumed = 0;
  const memberCounts: Record<string, number> = {};

  members.forEach(m => {
    const mInfo = calculateMemberMeals(m.id, meals);
    memberCounts[m.id] = mInfo.total;
    totalMealsConsumed += mInfo.total;
  });

  const effectiveMealRate = totalMealsConsumed > 0 
    ? Math.round((totalMessExpense / totalMealsConsumed) * 100) / 100 
    : 0;

  const memberMealBreakdown: Record<string, { mealCount: number; cost: number }> = {};
  members.forEach(m => {
    const count = memberCounts[m.id] || 0;
    memberMealBreakdown[m.id] = {
      mealCount: count,
      cost: Math.round(count * effectiveMealRate * 100) / 100,
    };
  });

  return {
    totalMessExpense,
    daysInMonth: validDaysInMonth,
    totalMemberStayedDays,
    dailyMessRate,
    totalMealsConsumed,
    effectiveMealRate,
    memberDaysBreakdown,
    memberMealBreakdown,
  };
}

// User Rule #3: Calculate Complete Member Payable Breakdown
// Formula: Payable Amount = Mess Bill + Rent Share + Other Expenses Share - Member Purchases
export function calculateMemberPayableBreakdown(
  memberId: string,
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[] = [],
  daysInMonth: number = 30,
  settings?: RoomSettings
): {
  member: Member | undefined;
  daysStayed: number;
  messBill: number;
  rentShare: number;
  otherExpensesShare: number;
  totalExpenseShare: number;
  memberPurchases: number; // What the member directly paid upfront
  netPayableAmount: number; // totalExpenseShare - memberPurchases (Positive = Needs to Pay, Negative = Gets Back)
  settlementsPaid: number; // Direct UPI/cash sent to roommates
  settlementsReceived: number; // Direct UPI/cash received from roommates
  finalRemainingDue: number; // netPayableAmount - settlementsPaid + settlementsReceived
  status: 'owes' | 'gets_back' | 'settled';
  formulaString: string;
} {
  const member = members.find(m => m.id === memberId);
  const validDays = Math.max(1, daysInMonth || 30);
  const memberDays = member?.daysStayed !== undefined ? member.daysStayed : (member?.daysStayedInMonth ?? validDays);
  
  // 1. Mess Bill
  const messMetrics = calculateMessMetrics(expenses, [], members, validDays);
  const isRentOnly = member?.membershipType === 'rent_only' || member?.isMessActive === false;
  const messBill = isRentOnly ? 0 : (messMetrics.memberDaysBreakdown[memberId]?.cost || 0);

  // 2. Rent Share (Calculated via preset equal/custom rent share or logged rent expense)
  const rentShare = calculateMemberRentShare(memberId, members, settings, expenses);

  // 3. Other Expenses Share (Wifi, Electricity, Cook, Gas Cylinder, Cleaning, etc.)
  const otherExpensesShare = expenses
    .filter(e => e.category !== 'rent' && !e.isMessExpense && e.category !== 'mess_food' && e.category !== 'groceries' && e.category !== 'gas_cylinder')
    .reduce((sum, e) => {
      const split = e.splits.find(s => s.memberId === memberId);
      return sum + (split ? split.amount : 0);
    }, 0);

  // 4. Total Expense Share = Mess + Rent + Other
  const totalExpenseShare = Math.round((messBill + rentShare + otherExpensesShare) * 100) / 100;

  // 5. Total Member Purchases (Paid upfront by this member)
  const memberPurchases = expenses
    .filter(e => e.paidBy === memberId)
    .reduce((sum, e) => sum + e.amount, 0);

  // 6. Net Payable Amount = Total Share - Member Purchases
  const netPayableAmount = Math.round((totalExpenseShare - memberPurchases) * 100) / 100;

  // 7. Settlements
  const settlementsPaid = settlements
    .filter(s => s.fromMemberId === memberId)
    .reduce((sum, s) => sum + s.amount, 0);

  const settlementsReceived = settlements
    .filter(s => s.toMemberId === memberId)
    .reduce((sum, s) => sum + s.amount, 0);

  const finalRemainingDue = Math.round((netPayableAmount - settlementsPaid + settlementsReceived) * 100) / 100;

  const status: 'owes' | 'gets_back' | 'settled' = 
    finalRemainingDue > 0.01 ? 'owes' : finalRemainingDue < -0.01 ? 'gets_back' : 'settled';

  const formulaString = `Mess (${messBill.toFixed(2)}) + Rent (${rentShare.toFixed(2)}) + Other (${otherExpensesShare.toFixed(2)}) - Paid Purchases (${memberPurchases.toFixed(2)}) = ${netPayableAmount >= 0 ? '+' : ''}${netPayableAmount.toFixed(2)}`;

  return {
    member,
    daysStayed: memberDays,
    messBill,
    rentShare,
    otherExpensesShare,
    totalExpenseShare,
    memberPurchases,
    netPayableAmount,
    settlementsPaid,
    settlementsReceived,
    finalRemainingDue,
    status,
    formulaString,
  };
}

// Generate complete Monthly Snapshot for Table View, WhatsApp & PDF
export function calculateMonthlySnapshot(roomData: RoomData): MonthlySnapshot {
  const { settings, members, expenses, settlements } = roomData;
  const daysInMonth = settings.daysInMonth || 30;
  const messMetrics = calculateMessMetrics(expenses, roomData.meals, members, daysInMonth);
  const netBalances = calculateNetBalances(members, expenses, settlements, settings);
  const simplifiedDebts = simplifyDebts(members, expenses, settlements, settings);

  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMessExpense = messMetrics.totalMessExpense;
  
  // Total Rent Calculation
  const totalRentExpense = settings.presetRentActive && settings.presetRentAmount && settings.presetRentAmount > 0
    ? (settings.presetRentType === 'per_member' 
        ? members.filter(m => m.membershipType !== 'mess_only').reduce((sum, m) => sum + calculateMemberRentShare(m.id, members, settings, expenses), 0)
        : settings.presetRentAmount)
    : expenses.filter(e => e.category === 'rent').reduce((sum, e) => sum + e.amount, 0);

  const memberSummaries: MemberMonthlyBreakdown[] = members.map(m => {
    const memType = m.membershipType || (m.isMessActive ? 'both' : 'rent_only');
    const memberDays = m.daysStayed !== undefined ? m.daysStayed : (m.daysStayedInMonth ?? daysInMonth);
    const messBill = memType === 'rent_only' 
      ? 0 
      : (messMetrics.memberDaysBreakdown[m.id]?.cost || 0);

    const rentShare = calculateMemberRentShare(m.id, members, settings, expenses);

    const otherExpensesShare = expenses
      .filter(e => e.category !== 'rent' && !e.isMessExpense && e.category !== 'mess_food' && e.category !== 'groceries' && e.category !== 'gas_cylinder')
      .reduce((sum, e) => {
        const split = e.splits.find(s => s.memberId === m.id);
        return sum + (split ? split.amount : 0);
      }, 0);

    const totalExpenseShare = Math.round((messBill + rentShare + otherExpensesShare) * 100) / 100;

    const totalPaid = expenses
      .filter(e => e.paidBy === m.id)
      .reduce((sum, e) => sum + e.amount, 0);

    const payableAmount = Math.round((totalExpenseShare - totalPaid) * 100) / 100;
    const netBalance = netBalances[m.id] || 0;
    const status: 'owes' | 'gets_back' | 'settled' = 
      payableAmount > 0.01 ? 'owes' : payableAmount < -0.01 ? 'gets_back' : 'settled';

    return {
      memberId: m.id,
      name: m.name,
      avatar: m.avatar,
      membershipType: memType,
      daysStayed: memberDays,
      messBill,
      rentShare,
      otherExpensesShare,
      totalExpenseShare,
      totalPaid,
      payableAmount,
      netBalance,
      status,
    };
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const now = new Date();
  const currentMonthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return {
    id: `snap_${Date.now()}`,
    roomId: settings.id,
    monthYear: currentMonthYear,
    archivedAt: new Date().toISOString(),
    totalSpend,
    totalMessExpense,
    totalRentExpense,
    daysInMonth,
    totalMemberStayedDays: messMetrics.totalMemberStayedDays,
    dailyMessRate: messMetrics.dailyMessRate,
    memberSummaries,
    simplifiedDebts,
    totalExpensesCount: expenses.length,
  };
}

// Supabase Syncing Service & Multi-device Online Cloud State
export async function syncRoomWithSupabase(roomData: RoomData): Promise<{ success: boolean; message: string }> {
  try {
    const serializedData = JSON.stringify(roomData);

    // 1. Upsert Room Core and Snapshot
    const { error: roomErr } = await supabase
      .from('roomex_rooms')
      .upsert({
        id: roomData.settings.id,
        name: roomData.settings.name,
        currency: roomData.settings.currency,
        currency_symbol: roomData.settings.currencySymbol,
        monthly_budget: roomData.settings.monthlyBudget,
        is_mess_enabled: roomData.settings.isMessEnabled,
        mess_calculation_mode: roomData.settings.messCalculationMode,
        fixed_meal_rate: roomData.settings.fixedMealRate,
        room_code: roomData.settings.roomCode,
        created_by_id: roomData.settings.createdById,
        raw_snapshot: serializedData,
        updated_at: new Date().toISOString(),
      });

    if (roomErr) {
      console.warn('Supabase rooms upsert notice:', roomErr.message);
    }

    // 2. Upsert Members
    if (roomData.members.length > 0) {
      const memberPayload = roomData.members.map(m => ({
        id: m.id,
        room_id: roomData.settings.id,
        name: m.name,
        email: m.email,
        username: m.username || null,
        allocated_password: m.allocatedPassword || m.password || null,
        avatar: m.avatar,
        phone: m.phone || null,
        role: m.role,
        permissions: m.permissions,
        membership_type: m.membershipType || 'both',
        custom_rent_share: m.customRentShare || 0,
        days_stayed: m.daysStayed || 30,
        is_mess_active: m.isMessActive ?? true,
        deposit_balance: m.depositBalance || 0,
        upi_id: m.upiId || null,
        is_on_vacation: !!m.isOnVacation,
        vacation_type: m.vacationType || 'active',
        vacation_reason: m.vacationReason || null,
      }));
      await supabase.from('roomex_members').upsert(memberPayload);
    }

    // 3. Upsert Expenses
    if (roomData.expenses.length > 0) {
      const expPayload = roomData.expenses.map(e => ({
        id: e.id,
        room_id: e.roomId,
        title: e.title,
        amount: e.amount,
        category: e.category,
        paid_by: e.paidBy,
        split_type: e.splitType,
        splits: e.splits,
        date: e.date,
        notes: e.notes || null,
        receipt_url: e.receiptUrl || null,
        created_by: e.createdBy,
        is_mess_expense: e.isMessExpense ?? false,
      }));
      await supabase.from('roomex_expenses').upsert(expPayload);
    }

    // 4. Upsert Meals
    if (roomData.meals.length > 0) {
      const mealPayload = roomData.meals.map(m => ({
        id: m.id,
        room_id: m.roomId,
        date: m.date,
        breakfast_count: m.breakfastCount,
        lunch_count: m.lunchCount,
        dinner_count: m.dinnerCount,
        guest_meals: m.guestMeals,
        note: m.note || null,
      }));
      await supabase.from('roomex_meals').upsert(mealPayload);
    }

    // 5. Upsert Settlements
    if (roomData.settlements.length > 0) {
      const setPayload = roomData.settlements.map(s => ({
        id: s.id,
        room_id: s.roomId,
        from_member_id: s.fromMemberId,
        to_member_id: s.toMemberId,
        amount: s.amount,
        date: s.date,
        payment_method: s.paymentMethod,
        reference_id: s.referenceId || null,
        notes: s.notes || null,
        recorded_by: s.recordedBy,
      }));
      await supabase.from('roomex_settlements').upsert(setPayload);
    }

    return { success: true, message: 'Worldwide Cloud Sync Complete (Supabase)' };
  } catch (err: any) {
    console.warn('Supabase sync warning (fallback active):', err);
    return { success: false, message: err?.message || 'Sync saved locally' };
  }
}

// Fetch Room Online from Supabase by Room Code
export async function fetchRoomFromSupabase(roomCode: string): Promise<RoomData | null> {
  try {
    const cleanCode = roomCode.trim().toUpperCase();
    const { data: roomRows, error: roomError } = await supabase
      .from('roomex_rooms')
      .select('*')
      .eq('room_code', cleanCode)
      .limit(1);

    if (roomError || !roomRows || roomRows.length === 0) {
      return null;
    }

    const roomRecord = roomRows[0];

    // If raw_snapshot exists and is valid JSON, restore with full fidelity
    if (roomRecord.raw_snapshot) {
      try {
        const parsed = JSON.parse(roomRecord.raw_snapshot);
        if (parsed && parsed.settings && parsed.members) {
          return parsed;
        }
      } catch {}
    }

    // Otherwise reconstruct from relational tables
    const roomId = roomRecord.id;

    const [membersRes, expensesRes, mealsRes, settlementsRes] = await Promise.all([
      supabase.from('roomex_members').select('*').eq('room_id', roomId),
      supabase.from('roomex_expenses').select('*').eq('room_id', roomId),
      supabase.from('roomex_meals').select('*').eq('room_id', roomId),
      supabase.from('roomex_settlements').select('*').eq('room_id', roomId),
    ]);

    const members: Member[] = (membersRes.data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      username: m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: m.email || `${m.id}@roomex.app`,
      password: m.allocated_password || 'password123',
      allocatedPassword: m.allocated_password || 'password123',
      avatar: m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      phone: m.phone || undefined,
      role: m.role || 'member',
      permissions: m.permissions || DEFAULT_PERMISSIONS[m.role as Role] || DEFAULT_PERMISSIONS.member,
      joinedAt: m.joined_at || new Date().toISOString(),
      isMessActive: m.is_mess_active !== false,
      depositBalance: Number(m.deposit_balance) || 0,
      daysStayed: Number(m.days_stayed) || 30,
      membershipType: m.membership_type || 'both',
      customRentShare: Number(m.custom_rent_share) || undefined,
      upiId: m.upi_id || undefined,
      isOnVacation: !!m.is_on_vacation,
      vacationType: m.vacation_type || 'active',
      vacationReason: m.vacation_reason || undefined,
      isCleaningActive: !m.is_on_vacation,
    }));

    const expenses: Expense[] = (expensesRes.data || []).map((e: any) => ({
      id: e.id,
      roomId: e.room_id,
      title: e.title,
      amount: Number(e.amount),
      category: e.category,
      paidBy: e.paid_by,
      splitType: e.split_type || 'equal',
      splits: e.splits || [],
      date: e.date,
      notes: e.notes || undefined,
      receiptUrl: e.receipt_url || undefined,
      createdBy: e.created_by || e.paid_by,
      createdAt: e.created_at || e.date,
      isMessExpense: !!e.is_mess_expense,
    }));

    const meals: DailyMealEntry[] = (mealsRes.data || []).map((meal: any) => ({
      id: meal.id,
      roomId: meal.room_id,
      date: meal.date,
      breakfastCount: meal.breakfast_count || {},
      lunchCount: meal.lunch_count || {},
      dinnerCount: meal.dinner_count || {},
      guestMeals: meal.guest_meals || {},
      note: meal.note || undefined,
    }));

    const settlements: Settlement[] = (settlementsRes.data || []).map((s: any) => ({
      id: s.id,
      roomId: s.room_id,
      fromMemberId: s.from_member_id,
      toMemberId: s.to_member_id,
      amount: Number(s.amount),
      date: s.date,
      paymentMethod: s.payment_method || 'upi',
      referenceId: s.reference_id || undefined,
      notes: s.notes || undefined,
      recordedBy: s.recorded_by || s.from_member_id,
    }));

    const settings: RoomSettings = {
      id: roomRecord.id,
      name: roomRecord.name,
      currency: roomRecord.currency || 'INR',
      currencySymbol: roomRecord.currency_symbol || '₹',
      monthlyBudget: Number(roomRecord.monthly_budget) || 1000,
      isMessEnabled: roomRecord.is_mess_enabled !== false,
      messCalculationMode: roomRecord.mess_calculation_mode || 'dynamic_ratio',
      messCalculationType: 'days_stayed',
      daysInMonth: 30,
      fixedMealRate: Number(roomRecord.fixed_meal_rate) || 4,
      roomCode: roomRecord.room_code || cleanCode,
      createdById: roomRecord.created_by_id || (members[0]?.id || 'admin_1'),
      createdAt: roomRecord.created_at || new Date().toISOString(),
      presetRentActive: false,
      presetRentAmount: 0,
      presetRentType: 'total_room',
    };

    return {
      settings,
      members: members.length > 0 ? members : INITIAL_ROOM_DATA.members,
      expenses,
      meals,
      settlements,
      auditLogs: [],
      cleaningSchedule: INITIAL_ROOM_DATA.cleaningSchedule,
      cleaningHistory: INITIAL_ROOM_DATA.cleaningHistory,
      monthlyArchives: [],
    };
  } catch (err) {
    console.warn('Error fetching room from Supabase:', err);
    return null;
  }
}
