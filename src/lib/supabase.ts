import { createClient } from '@supabase/supabase-js';

// Provided Supabase credentials
export const SUPABASE_URL = 
  ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 
  'https://hmzdpdnlmoxecihlqecf.supabase.co';

export const SUPABASE_ANON_KEY = 
  ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 
  'sb_publishable_il_c_wY0Dk4O_CN_qlyCmg_yDFLRJFM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface SupabaseSyncStatus {
  connected: boolean;
  lastSyncedAt: string | null;
  syncing: boolean;
  error: string | null;
}

// SQL Schema generator for users to execute in Supabase SQL editor if desired
export const SUPABASE_SQL_SCHEMA = `-- ROOMEX Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://app.supabase.com/project/hmzdpdnlmoxecihlqecf/sql)

-- 1. Rooms table
CREATE TABLE IF NOT EXISTS roomex_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  currency_symbol TEXT DEFAULT '$',
  monthly_budget NUMERIC DEFAULT 1000,
  is_mess_enabled BOOLEAN DEFAULT true,
  mess_calculation_mode TEXT DEFAULT 'dynamic_ratio',
  fixed_meal_rate NUMERIC DEFAULT 3.5,
  room_code TEXT UNIQUE,
  created_by_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Room Members table
CREATE TABLE IF NOT EXISTS roomex_members (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES roomex_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member', -- 'super_admin', 'admin', 'co_admin', 'member'
  permissions JSONB DEFAULT '{"canAddExpense": true, "canEditAnyExpense": false, "canDeleteExpense": false, "canManageMeals": true, "canSettleDebts": true, "canInviteMembers": false, "canGrantAdmin": false, "canEditRoomSettings": false}',
  is_mess_active BOOLEAN DEFAULT true,
  deposit_balance NUMERIC DEFAULT 0,
  upi_id TEXT,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Expenses table
CREATE TABLE IF NOT EXISTS roomex_expenses (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES roomex_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  paid_by TEXT REFERENCES roomex_members(id),
  split_type TEXT DEFAULT 'equal',
  splits JSONB NOT NULL,
  date TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  receipt_url TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_mess_expense BOOLEAN DEFAULT false
);

-- 4. Daily Meal Logs table
CREATE TABLE IF NOT EXISTS roomex_meals (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES roomex_rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  breakfast_count JSONB DEFAULT '{}',
  lunch_count JSONB DEFAULT '{}',
  dinner_count JSONB DEFAULT '{}',
  guest_meals JSONB DEFAULT '{}',
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Settlements table
CREATE TABLE IF NOT EXISTS roomex_settlements (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES roomex_rooms(id) ON DELETE CASCADE,
  from_member_id TEXT REFERENCES roomex_members(id),
  to_member_id TEXT REFERENCES roomex_members(id),
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT now(),
  payment_method TEXT DEFAULT 'upi',
  reference_id TEXT,
  notes TEXT,
  recorded_by TEXT
);

-- 6. Audit & Admin Logs table
CREATE TABLE IF NOT EXISTS roomex_audit_logs (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES roomex_rooms(id) ON DELETE CASCADE,
  performed_by TEXT,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) or public policies for seamless app usage:
ALTER TABLE roomex_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access roomex_rooms" ON roomex_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access roomex_members" ON roomex_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access roomex_expenses" ON roomex_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access roomex_meals" ON roomex_meals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access roomex_settlements" ON roomex_settlements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access roomex_audit_logs" ON roomex_audit_logs FOR ALL USING (true) WITH CHECK (true);
`;
