export type Role = 'super_admin' | 'admin' | 'co_admin' | 'member';

export type MembershipType = 'both' | 'rent_only' | 'mess_only';

export interface MemberPermissions {
  canAddExpense: boolean;
  canEditAnyExpense: boolean;
  canDeleteExpense: boolean;
  canManageMeals: boolean;
  canSettleDebts: boolean;
  canInviteMembers: boolean;
  canGrantAdmin: boolean;
  canEditRoomSettings: boolean;
}

export interface Member {
  id: string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  allocatedPassword?: string;
  avatar: string;
  phone?: string;
  role: Role;
  permissions: MemberPermissions;
  joinedAt: string;
  isMessActive: boolean;
  depositBalance: number; // Advance pool balance
  daysStayed?: number; // Number of days stayed in month for mess bill calculation
  daysStayedInMonth?: number; // Alias for daysStayed
  membershipType?: MembershipType; // 'both' | 'rent_only' | 'mess_only'
  enableMess?: boolean; // Toggle for mess expense participation (default: true)
  enableRent?: boolean; // Toggle for rent expense participation (default: true)
  enableOther?: boolean; // Toggle for other shared expenses participation (default: true)
  customRentShare?: number; // Optional manual custom rent override set by admin (e.g. ₹5,000 for master room)
  rentShareOverride?: boolean; // True if customRentShare should be used instead of equal split
  upiId?: string;
  allocatedBy?: string;
  // Vacation & Long Leave Participation Management
  isOnVacation?: boolean;
  vacationType?: 'vacation' | 'long_leave' | 'inactive' | 'active';
  vacationReason?: string;
  vacationStartDate?: string;
  vacationEndDate?: string;
  isCleaningActive?: boolean; // false when on vacation or cleaning paused
}

export type ExpenseCategory = 
  | 'groceries'
  | 'mess_food'
  | 'rent'
  | 'electricity'
  | 'internet'
  | 'maid_cook'
  | 'gas_cylinder'
  | 'water'
  | 'cleaning'
  | 'entertainment'
  | 'other';

export type SplitType = 'equal' | 'exact' | 'percentage' | 'meal_share' | 'custom_shares';

export interface SplitShare {
  memberId: string;
  amount: number;
  percentage?: number;
  shares?: number;
  mealsCount?: number;
}

export interface Expense {
  id: string;
  roomId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string; // memberId
  splitType: SplitType;
  splits: SplitShare[];
  date: string;
  notes?: string;
  receiptUrl?: string;
  createdBy: string;
  createdAt: string;
  isMessExpense?: boolean;
  autoScanned?: boolean;
}

export interface DailyMealEntry {
  id: string;
  roomId: string;
  date: string; // YYYY-MM-DD
  breakfastCount: Record<string, number>; // memberId -> count
  lunchCount: Record<string, number>;
  dinnerCount: Record<string, number>;
  guestMeals: Record<string, number>;
  note?: string;
}

export interface Settlement {
  id: string;
  roomId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  date: string;
  paymentMethod: 'upi' | 'cash' | 'bank_transfer' | 'other';
  referenceId?: string;
  notes?: string;
  recordedBy: string;
}

export interface SimplifiedDebt {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface AuditLog {
  id: string;
  roomId: string;
  performedBy?: string;
  actorId?: string;
  actorName?: string;
  action: string;
  details: string;
  timestamp: string;
}

export type CleaningInterval = 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'custom_days';

export interface CleaningSchedule {
  currentMemberId: string;
  nextMemberId: string;
  dutyDate: string; // YYYY-MM-DD
  dutyArea?: string; // e.g. "Bathroom", "Full Flat", "Kitchen", "Living Room", "Trash & Mopping"
  assignedDuties?: Record<string, string>; // memberId -> dutyArea (e.g. { "member_1": "Bathroom", "member_2": "Kitchen" })
  rotaOrder: string[]; // member IDs in order
  frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'custom_days';
  intervalDays?: number; // e.g. 1 (daily), 7 (weekly), 14 (bi-weekly), 30 (monthly), or custom X days
  lastCompletedDate?: string;
  lastCompletedBy?: string;
}

export interface CleaningHistoryEntry {
  id: string;
  roomId: string;
  memberId: string;
  memberName: string;
  action: 'completed' | 'skipped';
  date: string;
  timestamp: string;
  dutyArea?: string;
  notes?: string;
  skipReason?: string;
}

export interface MemberMonthlyBreakdown {
  memberId: string;
  name: string;
  avatar: string;
  membershipType: MembershipType;
  daysStayed: number;
  messBill: number;
  rentShare: number;
  otherExpensesShare: number;
  totalExpenseShare: number; // messBill + rentShare + otherExpensesShare
  totalPaid: number; // member purchase / amount paid
  payableAmount: number; // (messBill + rentShare + otherExpensesShare) - totalPaid (positive = needs to pay, negative = gets refund)
  netBalance: number; // Positive = gets back (blue), Negative = owes (green)
  status: 'owes' | 'gets_back' | 'settled';
}

export interface MonthlySnapshot {
  id: string;
  roomId: string;
  monthYear: string; // e.g. "August 2026"
  archivedAt: string;
  totalSpend: number;
  totalMessExpense: number;
  totalRentExpense: number;
  daysInMonth: number;
  totalMemberStayedDays?: number;
  dailyMessRate: number;
  memberSummaries: MemberMonthlyBreakdown[];
  simplifiedDebts: SimplifiedDebt[];
  totalExpensesCount: number;
}

export interface RoomSettings {
  id: string;
  name: string;
  currency: string;
  currencySymbol: string;
  monthlyBudget: number;
  isMessEnabled: boolean;
  messCalculationMode: 'dynamic_ratio' | 'fixed_rate';
  messCalculationType?: 'days_stayed' | 'meal_count'; // 'days_stayed': (Total Purchase / Days In Month) * Member Days Stayed
  daysInMonth?: number; // Total days in active month (defaults to 30 or 31)
  fixedMealRate?: number;
  roomCode: string;
  createdById: string;
  createdAt: string;
  // Preset Rent Management (Default Equal Split or Manual Custom Amount)
  presetRentActive?: boolean; // When true, preset rent is added into payable breakdown & balances
  presetRentAmount?: number; // Total Room Rent (e.g. 16000) or Per Member Rent (e.g. 4000)
  monthlyRent?: number; // Alias for presetRentAmount
  presetRentType?: 'total_room' | 'per_member'; // 'total_room' divides equally among members; 'per_member' charges flat per member
  presetRentDueDay?: number; // Day of month when rent is due (e.g. 1st or 5th)
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: Role;
  memberId: string;
  roomCode: string;
}

export interface MemberSession {
  role: Role;
  roomId: string;
  roomCode: string;
  memberId: string;
  username: string;
  name: string;
  email?: string;
  avatar?: string;
  loginTimestamp: number;
}

export interface RoomData {
  settings: RoomSettings;
  members: Member[];
  expenses: Expense[];
  meals: DailyMealEntry[];
  settlements: Settlement[];
  auditLogs: AuditLog[];
  cleaningSchedule: CleaningSchedule;
  cleaningHistory: CleaningHistoryEntry[];
  monthlyArchives: MonthlySnapshot[];
}
