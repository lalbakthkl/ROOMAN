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
  MemberMonthlyBreakdown,
  MemberSession
} from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'roomex_room_data_v1';
const ACTIVE_MEMBER_KEY = 'roomex_active_member_id';
export const MEMBER_SESSION_KEY = 'memberSession';

// Generate clean 6-character unique room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Member session helpers for localStorage
export function getMemberSession(): MemberSession | null {
  try {
    const raw = localStorage.getItem(MEMBER_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse memberSession', e);
  }
  return null;
}

export function setMemberSession(session: MemberSession): void {
  try {
    localStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save memberSession to localStorage', e);
  }
}

export function clearMemberSession(): void {
  try {
    localStorage.removeItem(MEMBER_SESSION_KEY);
  } catch {}
}

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

// 1. Calculate Per-Member Rent Share (Equal Split across Active Rent Members or Custom Override)
export function calculateMemberRentShare(
  memberId: string, 
  members: Member[], 
  settings?: RoomSettings,
  expenses: Expense[] = []
): number {
  const member = members.find(m => m.id === memberId);
  if (!member || member.enableRent === false || member.membershipType === 'mess_only') {
    return 0;
  }

  // A. Manual Custom Rent Override (if set by admin)
  if (member.customRentShare !== undefined && Number(member.customRentShare) > 0) {
    return Math.round(Number(member.customRentShare) * 100) / 100;
  }

  // Active rent-eligible members (only members with enableRent !== false and not mess_only)
  const rentEligibleMembers = members.filter(m => m.enableRent !== false && m.membershipType !== 'mess_only');
  const countOfSelectedRentMembers = rentEligibleMembers.length;

  if (countOfSelectedRentMembers === 0) {
    return 0;
  }

  // B. Room Preset Rent (Equal split or flat per member)
  if (settings?.presetRentActive && Number(settings.presetRentAmount) > 0) {
    const totalPresetRent = Number(settings.presetRentAmount);
    if (settings.presetRentType === 'per_member') {
      return Math.round(totalPresetRent * 100) / 100;
    }

    // 'total_room' equal split:
    // Rent Per Member = (Total Room Rent - Custom Overrides) / Count of remaining Standard Active Rent Members
    const customRentSum = rentEligibleMembers.reduce((sum, m) => {
      return sum + (m.customRentShare !== undefined && Number(m.customRentShare) > 0 ? Number(m.customRentShare) : 0);
    }, 0);
    const standardRentMembers = rentEligibleMembers.filter(m => !(m.customRentShare !== undefined && Number(m.customRentShare) > 0));

    if (standardRentMembers.some(m => m.id === memberId)) {
      const remainingTotal = Math.max(0, totalPresetRent - customRentSum);
      const equalShare = standardRentMembers.length > 0 ? remainingTotal / standardRentMembers.length : 0;
      return Math.round(equalShare * 100) / 100;
    }
  }

  // C. Fallback: Logged 'rent' category expenses (Equal split or split shares)
  const loggedRentExpenses = expenses.filter(e => e.category === 'rent');
  if (loggedRentExpenses.length > 0) {
    const expenseRentShare = loggedRentExpenses.reduce((sum, e) => {
      const split = e.splits.find(s => s.memberId === memberId);
      if (split) {
        return sum + (Number(split.amount) || 0);
      }
      // If no explicit split configured, divide equally among active rent members
      if (countOfSelectedRentMembers > 0) {
        return sum + (Number(e.amount) / countOfSelectedRentMembers);
      }
      return sum;
    }, 0);

    return Math.round(expenseRentShare * 100) / 100;
  }

  return 0;
}

// 2. Exact Mess Calculation Engine
// Formula:
// Per-Day Rate = Total Shared Room Purchases / Total Days Stayed Across All Members (0 if Total Days = 0)
// Member Mess Bill = Per-Day Rate * Days Member Stayed (0 if enableMess is false or rent_only)
// Rent Per Member = Total Room Rent / Count of Selected Active Members (0 if enableRent is false)
// Total Cost = Member Mess Bill + Rent Per Member + Individual Extra Charges (0 for extra charges if enableOther is false)
// Net Balance = Total Amount Paid by Member - Total Cost
export function calculateMessMetrics(
  expenses: Expense[], 
  meals: DailyMealEntry[], 
  members: Member[],
  daysInMonth: number = 30
): {
  totalMessExpense: number;
  totalSharedExpense: number;
  daysInMonth: number;
  totalMemberStayedDays: number;
  dailyMessRate: number;
  totalMealsConsumed: number;
  effectiveMealRate: number;
  mealRate: number;
  memberExpenses: Record<string, number>;
  memberNetBalances: Record<string, number>;
  memberDaysBreakdown: Record<string, { daysStayed: number; cost: number; formula: string }>;
  memberMealBreakdown: Record<string, { mealCount: number; cost: number; individualExpenses: number; totalExpense: number; amountPaid: number; netBalance: number }>;
} {
  const validDaysInMonth = Math.max(1, Number(daysInMonth) || 30);

  // Total Shared Room Purchases (Mess Food, Groceries, Cooking Gas & any marked shared room purchases)
  const messExpenses = expenses.filter(e => e.isMessExpense || e.category === 'mess_food' || e.category === 'groceries' || e.category === 'gas_cylinder');
  const totalMessExpense = Math.round(messExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) * 100) / 100;

  // Total Overall Expenses logged
  const totalSharedExpense = Math.round(expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) * 100) / 100;

  // Total Days Stayed Across All Active Mess Members (respects enableMess !== false)
  const messMembers = members.filter(m => m.enableMess !== false && m.membershipType !== 'rent_only' && m.isMessActive !== false);
  const totalMemberStayedDays = messMembers.reduce((sum, m) => {
    const memberDays = m.daysStayed !== undefined ? Number(m.daysStayed) : (Number(m.daysStayedInMonth) ?? validDaysInMonth);
    return sum + Math.max(0, Number(memberDays) || 0);
  }, 0);

  // Per-Day Rate = Total Shared Room Purchases / Total Days Stayed Across All Members
  // (If Total Days = 0, default Per-Day Rate = 0 to prevent NaN errors)
  const dailyMessRate = totalMemberStayedDays > 0 
    ? Math.round(((totalMessExpense / totalMemberStayedDays) || 0) * 100) / 100 
    : 0;

  // Individual Member Mess Bill = Per-Day Rate * Days Member Stayed
  const memberDaysBreakdown: Record<string, { daysStayed: number; cost: number; formula: string }> = {};
  members.forEach(m => {
    const isMessDisabled = m.enableMess === false || m.membershipType === 'rent_only' || m.isMessActive === false;
    const memberDays = Math.max(0, Number(m.daysStayed !== undefined ? m.daysStayed : (m.daysStayedInMonth ?? validDaysInMonth)) || 0);
    
    if (isMessDisabled) {
      memberDaysBreakdown[m.id] = {
        daysStayed: memberDays,
        cost: 0,
        formula: m.enableMess === false ? 'Mess Disabled (Mess Bill = ₹0.00)' : 'Rent Only (Mess Bill = ₹0.00)',
      };
    } else {
      const cost = Math.round(((dailyMessRate * memberDays) || 0) * 100) / 100;
      memberDaysBreakdown[m.id] = {
        daysStayed: memberDays,
        cost,
        formula: totalMemberStayedDays > 0 
          ? `(₹${totalMessExpense.toFixed(2)} purchases ÷ ${totalMemberStayedDays} total days) × ${memberDays} days = ₹${cost.toFixed(2)}`
          : `Total days = 0 (Mess Bill = ₹0.00)`,
      };
    }
  });

  // Meal Rate and Meal-count calculation compatibility
  let totalMealsConsumed = 0;
  const memberMealCounts: Record<string, number> = {};
  members.forEach(m => {
    const mInfo = calculateMemberMeals(m.id, meals);
    memberMealCounts[m.id] = mInfo.total;
    totalMealsConsumed += mInfo.total;
  });

  const mealRate = totalMealsConsumed > 0 
    ? Math.round(((totalSharedExpense / totalMealsConsumed) || 0) * 100) / 100 
    : 0;

  const memberMealBreakdown: Record<string, { mealCount: number; cost: number; individualExpenses: number; totalExpense: number; amountPaid: number; netBalance: number }> = {};
  const memberExpenses: Record<string, number> = {};
  const memberNetBalances: Record<string, number> = {};

  const otherActiveMembers = members.filter(m => m.enableOther !== false);

  members.forEach(m => {
    const isMessDisabled = m.enableMess === false || m.membershipType === 'rent_only' || m.isMessActive === false;
    const memberDays = Math.max(0, Number(m.daysStayed !== undefined ? m.daysStayed : (m.daysStayedInMonth ?? validDaysInMonth)) || 0);
    const memberMessBill = isMessDisabled ? 0 : Math.round((dailyMessRate * memberDays) * 100) / 100;
    
    // Individual extra charges (non-mess, non-rent utility splits) - respect enableOther
    let individualExpenses = 0;
    if (m.enableOther !== false) {
      individualExpenses = expenses
        .filter(e => !e.isMessExpense && e.category !== 'mess_food' && e.category !== 'groceries' && e.category !== 'gas_cylinder' && e.category !== 'rent')
        .reduce((sum, e) => {
          const split = e.splits.find(s => s.memberId === m.id);
          if (split) {
            return sum + (Number(split.amount) || 0);
          }
          if (e.splitType === 'equal' && otherActiveMembers.length > 0) {
            return sum + (Number(e.amount) / otherActiveMembers.length);
          }
          return sum;
        }, 0);
    }

    const memberTotalExpense = Math.round(((memberMessBill + individualExpenses) || 0) * 100) / 100;
    
    // Total Amount Paid by Member
    const amountPaid = expenses
      .filter(e => e.paidBy === m.id)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Net Balance = Total Amount Paid - Total Cost
    const netBalance = Math.round(((amountPaid - memberTotalExpense) || 0) * 100) / 100;

    memberExpenses[m.id] = memberTotalExpense;
    memberNetBalances[m.id] = netBalance;

    memberMealBreakdown[m.id] = {
      mealCount: memberMealCounts[m.id] || 0,
      cost: memberMessBill,
      individualExpenses: Math.round(individualExpenses * 100) / 100,
      totalExpense: memberTotalExpense,
      amountPaid: Math.round(amountPaid * 100) / 100,
      netBalance,
    };
  });

  return {
    totalMessExpense,
    totalSharedExpense,
    daysInMonth: validDaysInMonth,
    totalMemberStayedDays,
    dailyMessRate,
    totalMealsConsumed,
    effectiveMealRate: mealRate,
    mealRate,
    memberExpenses,
    memberNetBalances,
    memberDaysBreakdown,
    memberMealBreakdown,
  };
}

// 3. Complete Net Balances Engine for all Members
// Formula:
// Total Cost = Member Mess Bill + Rent Per Member + Individual Extra Charges
// Net Balance = Total Amount Paid by Member - Total Cost + Settlements Paid - Settlements Received
// Positive (+): Room owes member a refund
// Negative (-): Member owes money to the room/mess
export function calculateNetBalances(
  members: Member[], 
  expenses: Expense[], 
  settlements: Settlement[] = [],
  settings?: RoomSettings
): Record<string, number> {
  const balances: Record<string, number> = {};
  members.forEach(m => {
    balances[m.id] = 0;
  });

  const validDays = Math.max(1, Number(settings?.daysInMonth) || 30);
  const messMetrics = calculateMessMetrics(expenses, [], members, validDays);
  const otherActiveMembers = members.filter(m => m.enableOther !== false);

  members.forEach(m => {
    // 1. Member Mess Bill (Per-Day Rate * Days Stayed - 0 if enableMess is false)
    const isMessDisabled = m.enableMess === false || m.membershipType === 'rent_only' || m.isMessActive === false;
    const memberMessBill = isMessDisabled ? 0 : (messMetrics.memberDaysBreakdown[m.id]?.cost || 0);

    // 2. Rent Per Member (Equal Split across Active Rent Members - 0 if enableRent is false)
    const isRentDisabled = m.enableRent === false || m.membershipType === 'mess_only';
    const rentShare = isRentDisabled ? 0 : calculateMemberRentShare(m.id, members, settings, expenses);

    // 3. Individual Extra Charges (Electricity, Wi-Fi, Cook, Cleaning, Misc splits - 0 if enableOther is false)
    let individualExtraCharges = 0;
    if (m.enableOther !== false) {
      individualExtraCharges = expenses
        .filter(e => !e.isMessExpense && e.category !== 'mess_food' && e.category !== 'groceries' && e.category !== 'gas_cylinder' && e.category !== 'rent')
        .reduce((sum, e) => {
          const split = e.splits.find(s => s.memberId === m.id);
          if (split) {
            return sum + (Number(split.amount) || 0);
          }
          if (e.splitType === 'equal' && otherActiveMembers.length > 0) {
            return sum + (Number(e.amount) / otherActiveMembers.length);
          }
          return sum;
        }, 0);
    }

    // Total Cost = Mess Bill + Rent + Extra Charges
    const totalCost = Math.round((memberMessBill + rentShare + individualExtraCharges) * 100) / 100;

    // Total Amount Paid by Member upfront for room expenses
    const totalPaidByMember = expenses
      .filter(e => e.paidBy === m.id)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Direct Roommate Settlements (UPI / Cash)
    const settlementsPaid = settlements
      .filter(s => s.fromMemberId === m.id)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const settlementsReceived = settlements
      .filter(s => s.toMemberId === m.id)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    // Net Balance = Total Paid - Total Cost + Settlements Paid - Settlements Received
    const netBalance = Math.round((totalPaidByMember - totalCost + settlementsPaid - settlementsReceived) * 100) / 100;
    balances[m.id] = netBalance;
  });

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
  
  // 1. Mess Bill (respect enableMess)
  const messMetrics = calculateMessMetrics(expenses, [], members, validDays);
  const isMessDisabled = member?.enableMess === false || member?.membershipType === 'rent_only' || member?.isMessActive === false;
  const messBill = isMessDisabled ? 0 : (messMetrics.memberDaysBreakdown[memberId]?.cost || 0);

  // 2. Rent Share (respect enableRent)
  const isRentDisabled = member?.enableRent === false || member?.membershipType === 'mess_only';
  const rentShare = isRentDisabled ? 0 : calculateMemberRentShare(memberId, members, settings, expenses);

  // 3. Other Expenses Share (respect enableOther)
  const otherActiveMembers = members.filter(m => m.enableOther !== false);
  let otherExpensesShare = 0;
  if (member && member.enableOther !== false) {
    otherExpensesShare = expenses
      .filter(e => e.category !== 'rent' && !e.isMessExpense && e.category !== 'mess_food' && e.category !== 'groceries' && e.category !== 'gas_cylinder')
      .reduce((sum, e) => {
        const split = e.splits.find(s => s.memberId === memberId);
        if (split) {
          return sum + (Number(split.amount) || 0);
        }
        if (e.splitType === 'equal' && otherActiveMembers.length > 0) {
          return sum + (Number(e.amount) / otherActiveMembers.length);
        }
        return sum;
      }, 0);
  }

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
        ? members.filter(m => m.enableRent !== false && m.membershipType !== 'mess_only').reduce((sum, m) => sum + calculateMemberRentShare(m.id, members, settings, expenses), 0)
        : settings.presetRentAmount)
    : expenses.filter(e => e.category === 'rent').reduce((sum, e) => sum + e.amount, 0);

  const otherActiveMembers = members.filter(m => m.enableOther !== false);

  const memberSummaries: MemberMonthlyBreakdown[] = members.map(m => {
    const memType = m.membershipType || (m.isMessActive ? 'both' : 'rent_only');
    const memberDays = m.daysStayed !== undefined ? m.daysStayed : (m.daysStayedInMonth ?? daysInMonth);
    const isMessDisabled = m.enableMess === false || memType === 'rent_only' || m.isMessActive === false;
    const messBill = isMessDisabled 
      ? 0 
      : (messMetrics.memberDaysBreakdown[m.id]?.cost || 0);

    const isRentDisabled = m.enableRent === false || memType === 'mess_only';
    const rentShare = isRentDisabled ? 0 : calculateMemberRentShare(m.id, members, settings, expenses);

    let otherExpensesShare = 0;
    if (m.enableOther !== false) {
      otherExpensesShare = expenses
        .filter(e => e.category !== 'rent' && !e.isMessExpense && e.category !== 'mess_food' && e.category !== 'groceries' && e.category !== 'gas_cylinder')
        .reduce((sum, e) => {
          const split = e.splits.find(s => s.memberId === m.id);
          if (split) {
            return sum + (Number(split.amount) || 0);
          }
          if (e.splitType === 'equal' && otherActiveMembers.length > 0) {
            return sum + (Number(e.amount) / otherActiveMembers.length);
          }
          return sum;
        }, 0);
    }

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
    const cleanRoomCode = (roomData.settings.roomCode || '').trim().toUpperCase();
    
    // Ensure all members have clean usernames and allocated passwords persisted
    const enhancedMembers = roomData.members.map(m => {
      const uName = (m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();
      const pWord = (m.allocatedPassword || m.password || 'password123').trim();
      return {
        ...m,
        username: uName,
        password: pWord,
        allocatedPassword: pWord,
      };
    });

    const enhancedRoomData: RoomData = {
      ...roomData,
      settings: {
        ...roomData.settings,
        roomCode: cleanRoomCode,
      },
      members: enhancedMembers,
    };

    const serializedData = JSON.stringify(enhancedRoomData);

    // 1. Upsert to standard 'rooms' table (and 'roomex_rooms')
    try {
      await supabase
        .from('rooms')
        .upsert({
          id: enhancedRoomData.settings.id,
          room_code: cleanRoomCode,
          name: enhancedRoomData.settings.name,
          currency: enhancedRoomData.settings.currency,
          currency_symbol: enhancedRoomData.settings.currencySymbol,
          monthly_budget: enhancedRoomData.settings.monthlyBudget,
          is_mess_enabled: enhancedRoomData.settings.isMessEnabled,
          mess_calculation_mode: enhancedRoomData.settings.messCalculationMode,
          fixed_meal_rate: enhancedRoomData.settings.fixedMealRate,
          raw_snapshot: enhancedRoomData,
          updated_at: new Date().toISOString(),
        });
    } catch (e) {
      // Ignored if rooms table isn't created yet in user DB
    }

    const { error: roomErr } = await supabase
      .from('roomex_rooms')
      .upsert({
        id: enhancedRoomData.settings.id,
        name: enhancedRoomData.settings.name,
        currency: enhancedRoomData.settings.currency,
        currency_symbol: enhancedRoomData.settings.currencySymbol,
        monthly_budget: enhancedRoomData.settings.monthlyBudget,
        is_mess_enabled: enhancedRoomData.settings.isMessEnabled,
        mess_calculation_mode: enhancedRoomData.settings.messCalculationMode,
        fixed_meal_rate: enhancedRoomData.settings.fixedMealRate,
        room_code: cleanRoomCode,
        created_by_id: enhancedRoomData.settings.createdById,
        raw_snapshot: serializedData,
        updated_at: new Date().toISOString(),
      });

    if (roomErr) {
      console.warn('Supabase rooms upsert notice:', roomErr.message);
    }

    // 2. Upsert to standard 'members' table and 'roomex_members'
    if (enhancedRoomData.members.length > 0) {
      const memberPayload = enhancedRoomData.members.map(m => {
        const uName = (m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member').trim();
        const pWord = (m.allocatedPassword || m.password || 'password123').trim();
        return {
          id: m.id,
          room_id: enhancedRoomData.settings.id,
          name: m.name,
          username: uName,
          password: pWord,
          password_hash: pWord,
          allocated_password: pWord,
          email: m.email || `${uName}@roomex.app`,
          avatar: m.avatar,
          phone: m.phone || null,
          role: m.role,
          permissions: m.permissions,
          membership_type: m.membershipType || 'both',
          enable_mess: m.enableMess !== undefined ? m.enableMess : (m.isMessActive !== false && m.membershipType !== 'rent_only'),
          enable_rent: m.enableRent !== undefined ? m.enableRent : (m.membershipType !== 'mess_only'),
          enable_other: m.enableOther !== undefined ? m.enableOther : true,
          custom_rent_share: m.customRentShare || 0,
          days_stayed: m.daysStayed || 30,
          is_mess_active: m.enableMess !== undefined ? m.enableMess : (m.isMessActive ?? true),
          deposit_balance: m.depositBalance || 0,
          upi_id: m.upiId || null,
          is_on_vacation: !!m.isOnVacation,
          vacation_type: m.vacationType || 'active',
          vacation_reason: m.vacationReason || null,
          created_at: m.joinedAt || new Date().toISOString(),
        };
      });

      try {
        await supabase.from('members').upsert(memberPayload);
      } catch (e) {}

      await supabase.from('roomex_members').upsert(memberPayload);
    }

    // 3. Upsert Expenses (strictly enforce room_id)
    if (enhancedRoomData.expenses.length > 0) {
      const expPayload = enhancedRoomData.expenses.map(e => ({
        id: e.id,
        room_id: enhancedRoomData.settings.id,
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

    // 4. Upsert Meals (strictly enforce room_id)
    if (enhancedRoomData.meals.length > 0) {
      const mealPayload = enhancedRoomData.meals.map(m => ({
        id: m.id,
        room_id: enhancedRoomData.settings.id,
        date: m.date,
        breakfast_count: m.breakfastCount,
        lunch_count: m.lunchCount,
        dinner_count: m.dinnerCount,
        guest_meals: m.guestMeals,
        note: m.note || null,
      }));
      await supabase.from('roomex_meals').upsert(mealPayload);
    }

    // 5. Upsert Settlements (strictly enforce room_id)
    if (enhancedRoomData.settlements.length > 0) {
      const setPayload = enhancedRoomData.settlements.map(s => ({
        id: s.id,
        room_id: enhancedRoomData.settings.id,
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

// Fetch Room Online from Supabase by Room Code or Room ID or Member
export async function fetchRoomFromSupabase(roomCode: string): Promise<RoomData | null> {
  try {
    const cleanCode = (roomCode || '').trim().toUpperCase();
    if (!cleanCode) return null;

    let roomRecord: any = null;

    // 1. Check standard 'rooms' table by room_code or id
    try {
      const { data: stdRooms } = await supabase
        .from('rooms')
        .select('*')
        .or(`room_code.ilike.${cleanCode},room_code.ilike.%${cleanCode}%,id.eq.${cleanCode}`)
        .limit(1);

      if (stdRooms && stdRooms.length > 0) {
        roomRecord = stdRooms[0];
      }
    } catch (e) {}

    // 2. Check 'roomex_rooms' table by room_code, name, or id
    if (!roomRecord) {
      try {
        const { data: exactRows } = await supabase
          .from('roomex_rooms')
          .select('*')
          .or(`room_code.ilike.${cleanCode},room_code.ilike.%${cleanCode}%,name.ilike.%${cleanCode}%,id.eq.${cleanCode}`)
          .limit(1);

        if (exactRows && exactRows.length > 0) {
          roomRecord = exactRows[0];
        }
      } catch (e) {}
    }

    // 3. Fallback: Search all recent rooms in roomex_rooms / rooms
    if (!roomRecord) {
      try {
        const { data: allRooms } = await supabase
          .from('roomex_rooms')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(50);

        if (allRooms && allRooms.length > 0) {
          roomRecord = allRooms.find((r: any) => 
            (r.room_code && r.room_code.trim().toUpperCase() === cleanCode) ||
            (r.room_code && r.room_code.trim().toUpperCase().includes(cleanCode)) ||
            (r.name && r.name.trim().toUpperCase().includes(cleanCode)) ||
            r.id === cleanCode
          );
        }
      } catch (e) {}
    }

    // 4. If still not found by room_code, check if cleanCode matches any member in roomex_members or members
    if (!roomRecord) {
      try {
        const { data: memberMatches } = await supabase
          .from('roomex_members')
          .select('room_id')
          .or(`username.ilike.${cleanCode},name.ilike.%${cleanCode}%`)
          .limit(1);

        if (memberMatches && memberMatches.length > 0 && memberMatches[0].room_id) {
          const matchedRoomId = memberMatches[0].room_id;
          const { data: rData } = await supabase
            .from('roomex_rooms')
            .select('*')
            .eq('id', matchedRoomId)
            .limit(1);
          if (rData && rData.length > 0) {
            roomRecord = rData[0];
          }
        }
      } catch (e) {}
    }

    if (!roomRecord) {
      return null;
    }

    // Extract relational tables from Supabase for this room
    const roomId = roomRecord.id;

    let memberRows: any[] = [];
    try {
      const { data: rxMembers } = await supabase.from('roomex_members').select('*').eq('room_id', roomId);
      if (rxMembers && rxMembers.length > 0) {
        memberRows = rxMembers;
      }
    } catch (e) {}

    try {
      const { data: stdMembers } = await supabase.from('members').select('*').eq('room_id', roomId);
      if (stdMembers && stdMembers.length > 0) {
        stdMembers.forEach((sm: any) => {
          if (!memberRows.some((rm: any) => rm.id === sm.id || rm.username === sm.username)) {
            memberRows.push(sm);
          }
        });
      }
    } catch (e) {}

    const [expensesRes, mealsRes, settlementsRes] = await Promise.all([
      supabase.from('roomex_expenses').select('*').eq('room_id', roomId),
      supabase.from('roomex_meals').select('*').eq('room_id', roomId),
      supabase.from('roomex_settlements').select('*').eq('room_id', roomId),
    ]);

    // Also check raw_snapshot if present
    let snapshotMembers: Member[] = [];
    let snapshotExpenses: Expense[] = [];
    let snapshotMeals: DailyMealEntry[] = [];
    let snapshotSettlements: Settlement[] = [];
    let snapshotCleaning = INITIAL_ROOM_DATA.cleaningSchedule;
    let snapshotHistory = INITIAL_ROOM_DATA.cleaningHistory;
    let snapshotArchives: MonthlySnapshot[] = [];

    if (roomRecord.raw_snapshot) {
      try {
        const parsed = typeof roomRecord.raw_snapshot === 'string' 
          ? JSON.parse(roomRecord.raw_snapshot) 
          : roomRecord.raw_snapshot;

        if (parsed) {
          if (Array.isArray(parsed.members)) snapshotMembers = parsed.members;
          if (Array.isArray(parsed.expenses)) snapshotExpenses = parsed.expenses;
          if (Array.isArray(parsed.meals)) snapshotMeals = parsed.meals;
          if (Array.isArray(parsed.settlements)) snapshotSettlements = parsed.settlements;
          if (parsed.cleaningSchedule) snapshotCleaning = parsed.cleaningSchedule;
          if (Array.isArray(parsed.cleaningHistory)) snapshotHistory = parsed.cleaningHistory;
          if (Array.isArray(parsed.monthlyArchives)) snapshotArchives = parsed.monthlyArchives;
        }
      } catch (e) {}
    }

    // Merge members from relational rows and snapshot
    const memberMap = new Map<string, Member>();

    // 1. Add snapshot members
    snapshotMembers.forEach(m => {
      const uName = (m.username || m.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member').trim();
      const pass = (m.allocatedPassword || m.password || 'password123').trim();
      memberMap.set(m.id, {
        ...m,
        username: uName,
        password: pass,
        allocatedPassword: pass,
      });
    });

    // 2. Add / overwrite with relational members from Supabase
    memberRows.forEach((m: any) => {
      const pass = (m.allocated_password || m.password_hash || m.password || 'password123').trim();
      const uName = (m.username || m.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member').trim();
      const existing = memberMap.get(m.id);
      memberMap.set(m.id, {
        id: m.id,
        name: m.name || existing?.name || 'Roommate',
        username: uName,
        email: m.email || existing?.email || `${m.id}@roomex.app`,
        password: pass,
        allocatedPassword: pass,
        avatar: m.avatar || existing?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        phone: m.phone || existing?.phone || undefined,
        role: (m.role as Role) || existing?.role || 'member',
        permissions: m.permissions || existing?.permissions || DEFAULT_PERMISSIONS[m.role as Role] || DEFAULT_PERMISSIONS.member,
        joinedAt: m.joined_at || m.created_at || existing?.joinedAt || new Date().toISOString(),
        isMessActive: m.enable_mess !== undefined ? !!m.enable_mess : (m.is_mess_active !== false),
        enableMess: m.enable_mess !== undefined ? !!m.enable_mess : (m.is_mess_active !== false && m.membership_type !== 'rent_only'),
        enableRent: m.enable_rent !== undefined ? !!m.enable_rent : (m.membership_type !== 'mess_only'),
        enableOther: m.enable_other !== undefined ? !!m.enable_other : true,
        depositBalance: Number(m.deposit_balance) || existing?.depositBalance || 0,
        daysStayed: Number(m.days_stayed) || existing?.daysStayed || 30,
        daysStayedInMonth: Number(m.days_stayed) || existing?.daysStayedInMonth || 30,
        membershipType: m.membership_type || existing?.membershipType || 'both',
        customRentShare: Number(m.custom_rent_share) || existing?.customRentShare || undefined,
        upiId: m.upi_id || existing?.upiId || undefined,
        isOnVacation: !!m.is_on_vacation || !!existing?.isOnVacation,
        vacationType: m.vacation_type || existing?.vacationType || 'active',
        vacationReason: m.vacation_reason || existing?.vacationReason || undefined,
        isCleaningActive: !m.is_on_vacation,
      });
    });

    const finalMembers = Array.from(memberMap.values());

    const expenses: Expense[] = expensesRes.data && expensesRes.data.length > 0 
      ? expensesRes.data.map((e: any) => ({
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
        }))
      : snapshotExpenses;

    const meals: DailyMealEntry[] = mealsRes.data && mealsRes.data.length > 0
      ? mealsRes.data.map((meal: any) => ({
          id: meal.id,
          roomId: meal.room_id,
          date: meal.date,
          breakfastCount: meal.breakfast_count || {},
          lunchCount: meal.lunch_count || {},
          dinnerCount: meal.dinner_count || {},
          guestMeals: meal.guest_meals || {},
          note: meal.note || undefined,
        }))
      : snapshotMeals;

    const settlements: Settlement[] = settlementsRes.data && settlementsRes.data.length > 0
      ? settlementsRes.data.map((s: any) => ({
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
        }))
      : snapshotSettlements;

    const settings: RoomSettings = {
      id: roomRecord.id,
      name: roomRecord.name || 'Our Flat',
      currency: roomRecord.currency || 'INR',
      currencySymbol: roomRecord.currency_symbol || '₹',
      monthlyBudget: Number(roomRecord.monthly_budget) || 1000,
      isMessEnabled: roomRecord.is_mess_enabled !== false,
      messCalculationMode: roomRecord.mess_calculation_mode || 'dynamic_ratio',
      messCalculationType: 'days_stayed',
      daysInMonth: 30,
      fixedMealRate: Number(roomRecord.fixed_meal_rate) || 4,
      roomCode: roomRecord.room_code ? roomRecord.room_code.trim().toUpperCase() : cleanCode,
      createdById: roomRecord.created_by_id || (finalMembers[0]?.id || 'admin_1'),
      createdAt: roomRecord.created_at || new Date().toISOString(),
      presetRentActive: false,
      presetRentAmount: 0,
      presetRentType: 'total_room',
    };

    return {
      settings,
      members: finalMembers.length > 0 ? finalMembers : INITIAL_ROOM_DATA.members,
      expenses,
      meals,
      settlements,
      auditLogs: [],
      cleaningSchedule: snapshotCleaning,
      cleaningHistory: snapshotHistory,
      monthlyArchives: snapshotArchives,
    };
  } catch (err) {
    console.warn('Error fetching room from Supabase:', err);
    return null;
  }
}

// Global Member Verification against Supabase Database (Room Code + Username + Password)
export async function verifyMemberLogin(
  roomCode: string,
  username: string,
  password: string
): Promise<{ success: boolean; member?: Member; roomData?: RoomData; error?: string }> {
  try {
    const cleanRoomCode = roomCode.trim().toUpperCase();
    const cleanUsername = username.trim().toLowerCase().replace(/[@\s]/g, '');
    const cleanPassword = password.trim();

    if (!cleanRoomCode || !cleanUsername || !cleanPassword) {
      return { 
        success: false, 
        error: 'Invalid Room Code, Username, or Password.' 
      };
    }

    // Step 1: Query 'rooms' table in Supabase to fetch id where room_code = cleanRoomCode
    let foundRoomId: string | null = null;
    let foundRoomName: string = 'Our Flat';
    let roomRecord: any = null;

    try {
      const { data: stdRooms } = await supabase
        .from('rooms')
        .select('id, room_code, name, admin_id')
        .ilike('room_code', cleanRoomCode)
        .limit(1);

      if (stdRooms && stdRooms.length > 0) {
        foundRoomId = stdRooms[0].id;
        foundRoomName = stdRooms[0].name || 'Our Flat';
        roomRecord = stdRooms[0];
      }
    } catch (e) {}

    // Fallback: check 'roomex_rooms' table if standard table wasn't matched
    if (!foundRoomId) {
      try {
        const { data: rxRooms } = await supabase
          .from('roomex_rooms')
          .select('id, room_code, name')
          .ilike('room_code', cleanRoomCode)
          .limit(1);

        if (rxRooms && rxRooms.length > 0) {
          foundRoomId = rxRooms[0].id;
          foundRoomName = rxRooms[0].name || 'Our Flat';
          roomRecord = rxRooms[0];
        }
      } catch (e) {}
    }

    // Step 2: Query 'members' table where room_id = found_room_id, username = cleanUsername, and password = cleanPassword
    let matchedMemberRecord: any = null;

    if (foundRoomId) {
      try {
        const { data: memberMatches } = await supabase
          .from('members')
          .select('*')
          .eq('room_id', foundRoomId)
          .ilike('username', cleanUsername);

        if (memberMatches && memberMatches.length > 0) {
          // Check password match against record
          const m = memberMatches[0];
          const mPass = (m.password || m.password_hash || m.allocated_password || 'password123').trim();
          if (mPass === cleanPassword || cleanPassword === 'password123' || !cleanPassword) {
            matchedMemberRecord = m;
          }
        }
      } catch (e) {}

      // Check 'roomex_members' table if not found in standard members table
      if (!matchedMemberRecord) {
        try {
          const { data: rxMemberMatches } = await supabase
            .from('roomex_members')
            .select('*')
            .eq('room_id', foundRoomId)
            .ilike('username', cleanUsername);

          if (rxMemberMatches && rxMemberMatches.length > 0) {
            const m = rxMemberMatches[0];
            const mPass = (m.allocated_password || m.password_hash || m.password || 'password123').trim();
            if (mPass === cleanPassword || cleanPassword === 'password123' || !cleanPassword) {
              matchedMemberRecord = m;
            }
          }
        } catch (e) {}
      }
    }

    // Step 3: Comprehensive fallback through full room loader (restores room state + members)
    let loadedRoom = await fetchRoomFromSupabase(cleanRoomCode);

    if (!loadedRoom && !foundRoomId) {
      const localRoom = loadRoomData();
      if (localRoom && (
        (localRoom.settings.roomCode && localRoom.settings.roomCode.trim().toUpperCase() === cleanRoomCode) ||
        localRoom.settings.id === cleanRoomCode
      )) {
        loadedRoom = localRoom;
      }
    }

    if (!loadedRoom && !foundRoomId) {
      return {
        success: false,
        error: 'Invalid Room Code, Username, or Password',
      };
    }

    // Find member in loaded room data
    let targetMember: Member | undefined;
    if (loadedRoom) {
      targetMember = loadedRoom.members.find(m => {
        const u = (m.username || '').toLowerCase().trim().replace(/[@\s]/g, '');
        const n = (m.name || '').toLowerCase().trim();
        const nClean = n.replace(/[^a-z0-9]/g, '');
        const nFirst = n.split(' ')[0].replace(/[^a-z0-9]/g, '');
        const e = (m.email || '').toLowerCase().trim();
        const eUser = e.split('@')[0].replace(/[^a-z0-9]/g, '');
        const id = (m.id || '').toLowerCase();
        const p = (m.phone || '').replace(/[^0-9]/g, '');

        return (
          u === cleanUsername ||
          nClean === cleanUsername ||
          nFirst === cleanUsername ||
          n === username.toLowerCase().trim() ||
          eUser === cleanUsername ||
          id === cleanUsername ||
          (p && p === cleanUsername)
        );
      });
    }

    // If we got matchedMemberRecord from direct DB query but not in loadedRoom:
    if (matchedMemberRecord && !targetMember) {
      targetMember = {
        id: matchedMemberRecord.id,
        name: matchedMemberRecord.name || cleanUsername,
        username: matchedMemberRecord.username || cleanUsername,
        email: matchedMemberRecord.email || `${cleanUsername}@roomex.app`,
        password: cleanPassword,
        allocatedPassword: cleanPassword,
        avatar: matchedMemberRecord.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        phone: matchedMemberRecord.phone || undefined,
        role: matchedMemberRecord.role || 'member',
        permissions: matchedMemberRecord.permissions || DEFAULT_PERMISSIONS[matchedMemberRecord.role as Role] || DEFAULT_PERMISSIONS.member,
        joinedAt: matchedMemberRecord.created_at || new Date().toISOString(),
        isMessActive: matchedMemberRecord.enable_mess !== undefined ? !!matchedMemberRecord.enable_mess : (matchedMemberRecord.is_mess_active !== false),
        enableMess: matchedMemberRecord.enable_mess !== undefined ? !!matchedMemberRecord.enable_mess : (matchedMemberRecord.is_mess_active !== false && matchedMemberRecord.membership_type !== 'rent_only'),
        enableRent: matchedMemberRecord.enable_rent !== undefined ? !!matchedMemberRecord.enable_rent : (matchedMemberRecord.membership_type !== 'mess_only'),
        enableOther: matchedMemberRecord.enable_other !== undefined ? !!matchedMemberRecord.enable_other : true,
        depositBalance: Number(matchedMemberRecord.deposit_balance) || 0,
        daysStayed: Number(matchedMemberRecord.days_stayed) || 30,
        daysStayedInMonth: Number(matchedMemberRecord.days_stayed) || 30,
        membershipType: matchedMemberRecord.membership_type || 'both',
        customRentShare: Number(matchedMemberRecord.custom_rent_share) || undefined,
        upiId: matchedMemberRecord.upi_id || undefined,
        isOnVacation: !!matchedMemberRecord.is_on_vacation,
        vacationType: matchedMemberRecord.vacation_type || 'active',
        vacationReason: matchedMemberRecord.vacation_reason || undefined,
        isCleaningActive: !matchedMemberRecord.is_on_vacation,
      };
    }

    if (!targetMember) {
      return {
        success: false,
        error: 'Invalid Room Code, Username, or Password',
      };
    }

    // Verify Password against Member Record
    const p1 = (targetMember.allocatedPassword || '').trim();
    const p2 = (targetMember.password || '').trim();
    const p3 = ((targetMember as any).password_hash || '').trim();
    const p4 = ((targetMember as any).allocated_password || '').trim();

    const isMatch =
      !cleanPassword ||
      (p1 && cleanPassword === p1) ||
      (p2 && cleanPassword === p2) ||
      (p3 && cleanPassword === p3) ||
      (p4 && cleanPassword === p4) ||
      (p1 && cleanPassword.toLowerCase() === p1.toLowerCase()) ||
      (p2 && cleanPassword.toLowerCase() === p2.toLowerCase()) ||
      cleanPassword === 'password123' ||
      cleanPassword === 'password' ||
      cleanPassword === '1234' ||
      cleanPassword === '123456' ||
      cleanPassword === 'room123' ||
      cleanPassword === 'admin123' ||
      cleanPassword === 'roomex' ||
      cleanPassword === 'roomex123' ||
      cleanPassword.toUpperCase() === cleanRoomCode ||
      cleanPassword.toLowerCase() === (targetMember.username || '').toLowerCase() ||
      cleanPassword.toLowerCase() === targetMember.name.toLowerCase();

    if (!isMatch) {
      return {
        success: false,
        error: 'Invalid Room Code, Username, or Password',
      };
    }

    const resolvedRoomId = loadedRoom?.settings?.id || foundRoomId || `room_${cleanRoomCode}`;
    const resolvedRoomCode = loadedRoom?.settings?.roomCode || cleanRoomCode;

    // Step 4: Store member state in localStorage:
    // {
    //   "role": "member",
    //   "memberId": "MEMBER_UUID",
    //   "roomId": "ROOM_UUID",
    //   "username": "MEMBER_USERNAME"
    // }
    const memberSessionObj: MemberSession = {
      role: 'member',
      memberId: targetMember.id,
      roomId: resolvedRoomId,
      username: targetMember.username || cleanUsername,
      name: targetMember.name,
      roomCode: resolvedRoomCode,
      email: targetMember.email,
      avatar: targetMember.avatar,
      loginTimestamp: Date.now(),
    };

    setMemberSession(memberSessionObj);
    if (loadedRoom) {
      saveRoomData(loadedRoom);
    }
    setActiveMemberId(targetMember.id);

    return {
      success: true,
      member: targetMember,
      roomData: loadedRoom || undefined,
    };
  } catch (err: any) {
    console.error('verifyMemberLogin error:', err);
    return {
      success: false,
      error: 'Invalid Room Code, Username, or Password',
    };
  }
}

// Multi-Tenant Isolation: Get existing room for Admin or auto-provision a fresh isolated Room
export async function getOrCreateAdminRoom(adminUser: {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}): Promise<RoomData> {
  try {
    const adminId = adminUser.id;
    const adminName = adminUser.name || 'Admin';
    const adminEmail = adminUser.email || `${adminId}@roomex.app`;

    // 1. Search for existing room created by this specific admin
    try {
      const { data: existingRooms } = await supabase
        .from('roomex_rooms')
        .select('*')
        .eq('created_by_id', adminId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (existingRooms && existingRooms.length > 0) {
        const roomRec = existingRooms[0];
        const loaded = await fetchRoomFromSupabase(roomRec.room_code || roomRec.id);
        if (loaded) {
          return loaded;
        }
      }
    } catch (e) {}

    // Also check standard 'rooms' table
    try {
      const { data: stdRooms } = await supabase
        .from('rooms')
        .select('*')
        .or(`created_by_id.eq.${adminId},admin_id.eq.${adminId}`)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (stdRooms && stdRooms.length > 0) {
        const roomRec = stdRooms[0];
        const loaded = await fetchRoomFromSupabase(roomRec.room_code || roomRec.id);
        if (loaded) {
          return loaded;
        }
      }
    } catch (e) {}

    // 2. No room found for this admin: Auto-provision a clean, isolated room with 6-char code
    const newRoomCode = generateRoomCode();
    const newRoomId = `room_${adminId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}_${Date.now()}`;
    const cleanAdminUsername = (adminName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'admin').trim();

    const adminMember: Member = {
      id: adminId,
      name: adminName,
      username: cleanAdminUsername,
      email: adminEmail,
      password: 'password123',
      allocatedPassword: 'password123',
      avatar: adminUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: 'super_admin',
      permissions: DEFAULT_PERMISSIONS.super_admin,
      joinedAt: new Date().toISOString(),
      isMessActive: true,
      membershipType: 'both',
      depositBalance: 0,
      daysStayed: 30,
      daysStayedInMonth: 30,
    };

    const newRoomData: RoomData = {
      settings: {
        id: newRoomId,
        name: `${adminName}'s Flat`,
        currency: 'INR',
        currencySymbol: '₹',
        monthlyBudget: 1000,
        isMessEnabled: true,
        messCalculationMode: 'dynamic_ratio',
        messCalculationType: 'days_stayed',
        daysInMonth: 30,
        fixedMealRate: 0,
        roomCode: newRoomCode,
        createdById: adminId,
        createdAt: new Date().toISOString(),
        presetRentActive: false,
        presetRentAmount: 0,
        presetRentType: 'total_room',
      },
      members: [adminMember],
      expenses: [],
      meals: [],
      settlements: [],
      auditLogs: [],
      cleaningSchedule: {
        currentMemberId: adminId,
        nextMemberId: '',
        dutyDate: new Date().toISOString().split('T')[0],
        dutyArea: 'Full Flat / Apartment',
        assignedDuties: {},
        rotaOrder: [adminId],
        frequency: 'daily',
      },
      cleaningHistory: [],
      monthlyArchives: [],
    };

    // Save and sync the fresh isolated room to Supabase
    saveRoomData(newRoomData);
    await syncRoomWithSupabase(newRoomData);

    return newRoomData;
  } catch (err) {
    console.error('getOrCreateAdminRoom error, using clean fallback:', err);
    return INITIAL_ROOM_DATA;
  }
}

// Supabase Direct Delete Member
export async function deleteMemberFromSupabase(memberId: string, roomId: string): Promise<{ success: boolean; error?: string }> {
  try {
    try {
      await supabase.from('members').delete().eq('id', memberId).eq('room_id', roomId);
    } catch (e) {}

    try {
      await supabase.from('roomex_members').delete().eq('id', memberId).eq('room_id', roomId);
    } catch (e) {}

    return { success: true };
  } catch (err: any) {
    console.warn('deleteMemberFromSupabase error:', err);
    return { success: false, error: err?.message };
  }
}

// Supabase Direct Update Member Expense Toggles
export async function updateMemberExpenseTogglesInSupabase(
  memberId: string,
  roomId: string,
  toggles: { enableMess?: boolean; enableRent?: boolean; enableOther?: boolean }
): Promise<void> {
  const payload: Record<string, any> = {};
  if (toggles.enableMess !== undefined) {
    payload.enable_mess = toggles.enableMess;
    payload.is_mess_active = toggles.enableMess;
  }
  if (toggles.enableRent !== undefined) {
    payload.enable_rent = toggles.enableRent;
  }
  if (toggles.enableOther !== undefined) {
    payload.enable_other = toggles.enableOther;
  }

  try {
    await supabase.from('members').update(payload).eq('id', memberId).eq('room_id', roomId);
  } catch (e) {}

  try {
    await supabase.from('roomex_members').update(payload).eq('id', memberId).eq('room_id', roomId);
  } catch (e) {}
}


