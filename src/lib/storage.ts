import { 
  RoomData, 
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
    id: 'room_skyline_402',
    name: 'Skyline Flat 402',
    currency: 'USD',
    currencySymbol: '$',
    monthlyBudget: 1800,
    isMessEnabled: true,
    messCalculationMode: 'dynamic_ratio',
    messCalculationType: 'days_stayed',
    daysInMonth: 30,
    fixedMealRate: 4.5,
    roomCode: 'SKY402',
    createdById: 'member_1',
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  members: [
    {
      id: 'member_1',
      name: 'Alex Rivera',
      username: 'alex',
      email: 'alex@roomex.app',
      password: 'password123',
      allocatedPassword: 'password123',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 234-5678',
      role: 'super_admin',
      permissions: { ...DEFAULT_PERMISSIONS.super_admin },
      joinedAt: '2026-08-01T00:00:00.000Z',
      isMessActive: true,
      membershipType: 'both',
      depositBalance: 250,
      daysStayed: 30,
      upiId: 'alex@upi',
    },
    {
      id: 'member_2',
      name: 'Brian Chen',
      username: 'brian',
      email: 'brian@roomex.app',
      password: 'password123',
      allocatedPassword: 'password123',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 345-6789',
      role: 'admin',
      permissions: { ...DEFAULT_PERMISSIONS.admin },
      joinedAt: '2026-08-01T00:00:00.000Z',
      isMessActive: true,
      membershipType: 'both',
      depositBalance: 250,
      daysStayed: 28,
      upiId: 'brian@okaxis',
    },
    {
      id: 'member_3',
      name: 'Chloe Miller',
      username: 'chloe',
      email: 'chloe@roomex.app',
      password: 'password123',
      allocatedPassword: 'password123',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 456-7890',
      role: 'co_admin',
      permissions: { ...DEFAULT_PERMISSIONS.co_admin },
      joinedAt: '2026-08-02T00:00:00.000Z',
      isMessActive: true,
      membershipType: 'both',
      depositBalance: 200,
      daysStayed: 25,
      upiId: 'chloe@ybl',
    },
    {
      id: 'member_4',
      name: 'David Patel',
      username: 'david',
      email: 'david@roomex.app',
      password: 'password123',
      allocatedPassword: 'password123',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 567-8901',
      role: 'member',
      permissions: { ...DEFAULT_PERMISSIONS.member },
      joinedAt: '2026-08-03T00:00:00.000Z',
      isMessActive: true,
      membershipType: 'both',
      depositBalance: 150,
      daysStayed: 20,
      upiId: 'david@paytm',
    },
  ],
  expenses: [
    {
      id: 'exp_1',
      roomId: 'room_skyline_402',
      title: 'High-Speed Fiber Wi-Fi (August)',
      amount: 60,
      category: 'internet',
      paidBy: 'member_1',
      splitType: 'equal',
      splits: [
        { memberId: 'member_1', amount: 15 },
        { memberId: 'member_2', amount: 15 },
        { memberId: 'member_3', amount: 15 },
        { memberId: 'member_4', amount: 15 },
      ],
      date: '2026-08-05T10:00:00.000Z',
      notes: '1 Gbps monthly bill with tax',
      createdBy: 'member_1',
      createdAt: '2026-08-05T10:00:00.000Z',
      isMessExpense: false,
    },
    {
      id: 'exp_2',
      roomId: 'room_skyline_402',
      title: 'Weekly Fresh Produce & Pantry Restock',
      amount: 144,
      category: 'mess_food',
      paidBy: 'member_2',
      splitType: 'meal_share',
      splits: [
        { memberId: 'member_1', amount: 40, mealsCount: 14 },
        { memberId: 'member_2', amount: 40, mealsCount: 14 },
        { memberId: 'member_3', amount: 36, mealsCount: 12 },
        { memberId: 'member_4', amount: 28, mealsCount: 10 },
      ],
      date: '2026-08-08T16:30:00.000Z',
      notes: 'Veggies, rice, lentils, oil, and spices from Farmer Market',
      createdBy: 'member_2',
      createdAt: '2026-08-08T16:30:00.000Z',
      isMessExpense: true,
    },
    {
      id: 'exp_3',
      roomId: 'room_skyline_402',
      title: 'Electricity & AC Utilities Bill',
      amount: 180,
      category: 'electricity',
      paidBy: 'member_3',
      splitType: 'equal',
      splits: [
        { memberId: 'member_1', amount: 45 },
        { memberId: 'member_2', amount: 45 },
        { memberId: 'member_3', amount: 45 },
        { memberId: 'member_4', amount: 45 },
      ],
      date: '2026-08-11T12:00:00.000Z',
      notes: 'State power utility receipt paid online',
      createdBy: 'member_3',
      createdAt: '2026-08-11T12:00:00.000Z',
      isMessExpense: false,
    },
    {
      id: 'exp_4',
      roomId: 'room_skyline_402',
      title: 'Kitchen Cooking Gas Refill Cylinder',
      amount: 38,
      category: 'gas_cylinder',
      paidBy: 'member_1',
      splitType: 'equal',
      splits: [
        { memberId: 'member_1', amount: 9.5 },
        { memberId: 'member_2', amount: 9.5 },
        { memberId: 'member_3', amount: 9.5 },
        { memberId: 'member_4', amount: 9.5 },
      ],
      date: '2026-08-14T09:00:00.000Z',
      notes: 'Delivered and fitted',
      createdBy: 'member_1',
      createdAt: '2026-08-14T09:00:00.000Z',
      isMessExpense: true,
    },
  ],
  meals: [
    {
      id: 'meal_2026_08_15',
      roomId: 'room_skyline_402',
      date: '2026-08-15',
      breakfastCount: { member_1: 1, member_2: 1, member_3: 1, member_4: 1 },
      lunchCount: { member_1: 1, member_2: 1, member_3: 0, member_4: 1 },
      dinnerCount: { member_1: 1, member_2: 1, member_3: 1, member_4: 1 },
      guestMeals: { member_1: 0, member_2: 1, member_3: 0, member_4: 0 },
      note: 'Chloe ate lunch at college',
    },
    {
      id: 'meal_2026_08_16',
      roomId: 'room_skyline_402',
      date: '2026-08-16',
      breakfastCount: { member_1: 1, member_2: 1, member_3: 1, member_4: 0 },
      lunchCount: { member_1: 1, member_2: 1, member_3: 1, member_4: 1 },
      dinnerCount: { member_1: 1, member_2: 1, member_3: 1, member_4: 1 },
      guestMeals: { member_1: 1, member_2: 0, member_3: 0, member_4: 0 },
      note: 'Alex had 1 dinner guest',
    },
    {
      id: 'meal_2026_08_17',
      roomId: 'room_skyline_402',
      date: '2026-08-17',
      breakfastCount: { member_1: 1, member_2: 1, member_3: 1, member_4: 1 },
      lunchCount: { member_1: 1, member_2: 1, member_3: 1, member_4: 1 },
      dinnerCount: { member_1: 1, member_2: 1, member_3: 1, member_4: 1 },
      guestMeals: { member_1: 0, member_2: 0, member_3: 0, member_4: 0 },
      note: 'Regular all-in day',
    }
  ],
  settlements: [
    {
      id: 'set_1',
      roomId: 'room_skyline_402',
      fromMemberId: 'member_4',
      toMemberId: 'member_1',
      amount: 30,
      date: '2026-08-12T14:00:00.000Z',
      paymentMethod: 'upi',
      referenceId: 'UPI-9821034821',
      notes: 'Wi-Fi and gas partial settlement',
      recordedBy: 'member_1',
    }
  ],
  auditLogs: [
    {
      id: 'log_1',
      roomId: 'room_skyline_402',
      performedBy: 'member_1',
      action: 'ROOM_CREATED',
      details: 'Alex created room "Skyline Flat 402"',
      timestamp: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'log_2',
      roomId: 'room_skyline_402',
      performedBy: 'member_1',
      action: 'ADMIN_PROMOTION',
      details: 'Alex appointed Brian Chen as Admin',
      timestamp: '2026-08-02T10:00:00.000Z',
    },
    {
      id: 'log_3',
      roomId: 'room_skyline_402',
      performedBy: 'member_1',
      action: 'ADMIN_PROMOTION',
      details: 'Alex appointed Chloe Miller as Co-Admin',
      timestamp: '2026-08-03T11:00:00.000Z',
    }
  ],
  cleaningSchedule: {
    currentMemberId: 'member_1',
    nextMemberId: 'member_2',
    dutyDate: new Date().toISOString().split('T')[0],
    dutyArea: 'Bathroom & Washroom',
    assignedDuties: {
      member_1: 'Bathroom & Washroom',
      member_2: 'Full Flat / Apartment',
      member_3: 'Kitchen & Sink',
      member_4: 'Living Room & Trash Mopping',
    },
    rotaOrder: ['member_1', 'member_2', 'member_3', 'member_4'],
    frequency: 'daily',
    lastCompletedDate: '2026-08-16',
    lastCompletedBy: 'member_4',
  },
  cleaningHistory: [
    {
      id: 'clean_1',
      roomId: 'room_skyline_402',
      memberId: 'member_4',
      memberName: 'David Patel',
      action: 'completed',
      date: '2026-08-16',
      timestamp: '2026-08-16T20:30:00.000Z',
      dutyArea: 'Kitchen & Sink',
      notes: 'Kitchen and main hall vacuumed & sanitized',
    },
    {
      id: 'clean_2',
      roomId: 'room_skyline_402',
      memberId: 'member_3',
      memberName: 'Chloe Miller',
      action: 'completed',
      date: '2026-08-15',
      timestamp: '2026-08-15T19:45:00.000Z',
      dutyArea: 'Bathroom & Washroom',
      notes: 'Trash disposal and common washroom cleaned',
    }
  ],
  monthlyArchives: [],
};

// Local storage reader/writer
export function loadRoomData(): RoomData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.settings && parsed.members) {
        // Ensure backwards compatibility with newly added fields
        if (!parsed.cleaningSchedule) {
          parsed.cleaningSchedule = INITIAL_ROOM_DATA.cleaningSchedule;
        }
        if (!parsed.cleaningHistory) {
          parsed.cleaningHistory = INITIAL_ROOM_DATA.cleaningHistory;
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
    console.warn('Failed to parse stored room data, using initial data', e);
  }
  saveRoomData(INITIAL_ROOM_DATA);
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

// Calculate Net Balances for each member
// Positive (+): Room owes this member money (they overpaid)
// Negative (-): Member owes money to the room
export function calculateNetBalances(
  members: Member[], 
  expenses: Expense[], 
  settlements: Settlement[]
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

  // 2. Process Settlements
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
  settlements: Settlement[]
): SimplifiedDebt[] {
  const balances = calculateNetBalances(members, expenses, settlements);

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
  daysInMonth: number = 30
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

  // 2. Rent Share
  const rentShare = expenses
    .filter(e => e.category === 'rent')
    .reduce((sum, e) => {
      const split = e.splits.find(s => s.memberId === memberId);
      return sum + (split ? split.amount : 0);
    }, 0);

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
  const netBalances = calculateNetBalances(members, expenses, settlements);
  const simplifiedDebts = simplifyDebts(members, expenses, settlements);

  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMessExpense = messMetrics.totalMessExpense;
  const totalRentExpense = expenses
    .filter(e => e.category === 'rent')
    .reduce((sum, e) => sum + e.amount, 0);

  const memberSummaries: MemberMonthlyBreakdown[] = members.map(m => {
    const memType = m.membershipType || (m.isMessActive ? 'both' : 'rent_only');
    const memberDays = m.daysStayed !== undefined ? m.daysStayed : (m.daysStayedInMonth ?? daysInMonth);
    const messBill = memType === 'rent_only' 
      ? 0 
      : (messMetrics.memberDaysBreakdown[m.id]?.cost || 0);

    const rentShare = expenses
      .filter(e => e.category === 'rent')
      .reduce((sum, e) => {
        const split = e.splits.find(s => s.memberId === m.id);
        return sum + (split ? split.amount : 0);
      }, 0);

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

// Supabase Syncing Service
export async function syncRoomWithSupabase(roomData: RoomData): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Try Upserting Room
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
      });

    if (roomErr) {
      console.warn('Supabase rooms sync warning:', roomErr.message);
      return { success: false, message: roomErr.message };
    }

    // 2. Upsert Members
    if (roomData.members.length > 0) {
      const memberPayload = roomData.members.map(m => ({
        id: m.id,
        room_id: roomData.settings.id,
        name: m.name,
        email: m.email,
        avatar: m.avatar,
        phone: m.phone || null,
        role: m.role,
        permissions: m.permissions,
        is_mess_active: m.isMessActive,
        deposit_balance: m.depositBalance,
        upi_id: m.upiId || null,
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

    return { success: true, message: 'Successfully synced with Supabase' };
  } catch (err: any) {
    console.warn('Supabase sync error (fallback active):', err);
    return { success: false, message: err?.message || 'Sync failed, offline mode active' };
  }
}
