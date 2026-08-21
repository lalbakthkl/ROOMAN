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
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Standard Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Flat / Room',
  currency TEXT DEFAULT 'INR',
  currency_symbol TEXT DEFAULT '₹',
  monthly_budget NUMERIC DEFAULT 1000,
  is_mess_enabled BOOLEAN DEFAULT true,
  mess_calculation_mode TEXT DEFAULT 'dynamic_ratio',
  fixed_meal_rate NUMERIC DEFAULT 4,
  raw_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Standard Members Table (Supports Global Member Login via Room Code + Username + Password)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  password_hash TEXT,
  allocated_password TEXT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'super_admin', 'admin', 'co_admin', 'member'
  email TEXT,
  phone TEXT,
  avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  permissions JSONB DEFAULT '{"canAddExpense": true, "canEditAnyExpense": false, "canDeleteExpense": false, "canManageMeals": true, "canSettleDebts": true, "canInviteMembers": false, "canGrantAdmin": false, "canEditRoomSettings": false}',
  is_mess_active BOOLEAN DEFAULT true,
  enable_mess BOOLEAN DEFAULT true,
  enable_rent BOOLEAN DEFAULT true,
  enable_other BOOLEAN DEFAULT true,
  deposit_balance NUMERIC DEFAULT 0,
  days_stayed NUMERIC DEFAULT 30,
  membership_type TEXT DEFAULT 'both',
  custom_rent_share NUMERIC DEFAULT 0,
  upi_id TEXT,
  is_on_vacation BOOLEAN DEFAULT false,
  vacation_type TEXT DEFAULT 'active',
  vacation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, username)
);

-- 3. Roomex Fallback / Extended Tables
CREATE TABLE IF NOT EXISTS roomex_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'INR',
  currency_symbol TEXT DEFAULT '₹',
  monthly_budget NUMERIC DEFAULT 1000,
  is_mess_enabled BOOLEAN DEFAULT true,
  mess_calculation_mode TEXT DEFAULT 'dynamic_ratio',
  fixed_meal_rate NUMERIC DEFAULT 4,
  room_code TEXT UNIQUE,
  created_by_id TEXT,
  raw_snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roomex_members (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  username TEXT,
  allocated_password TEXT,
  avatar TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member',
  permissions JSONB,
  is_mess_active BOOLEAN DEFAULT true,
  enable_mess BOOLEAN DEFAULT true,
  enable_rent BOOLEAN DEFAULT true,
  enable_other BOOLEAN DEFAULT true,
  deposit_balance NUMERIC DEFAULT 0,
  days_stayed NUMERIC DEFAULT 30,
  membership_type TEXT DEFAULT 'both',
  custom_rent_share NUMERIC DEFAULT 0,
  upi_id TEXT,
  is_on_vacation BOOLEAN DEFAULT false,
  vacation_type TEXT DEFAULT 'active',
  vacation_reason TEXT,
  joined_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roomex_expenses (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  paid_by TEXT,
  split_type TEXT DEFAULT 'equal',
  splits JSONB NOT NULL,
  date TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  receipt_url TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_mess_expense BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS roomex_meals (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  date DATE NOT NULL,
  breakfast_count JSONB DEFAULT '{}',
  lunch_count JSONB DEFAULT '{}',
  dinner_count JSONB DEFAULT '{}',
  guest_meals JSONB DEFAULT '{}',
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roomex_settlements (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  from_member_id TEXT,
  to_member_id TEXT,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT now(),
  payment_method TEXT DEFAULT 'upi',
  reference_id TEXT,
  notes TEXT,
  recorded_by TEXT
);

-- Enable Row Level Security (RLS) policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomex_settlements ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access so Members can login globally via Room Code + Username + Password
CREATE POLICY "Allow public all rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all roomex_rooms" ON roomex_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all roomex_members" ON roomex_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all roomex_expenses" ON roomex_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all roomex_meals" ON roomex_meals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all roomex_settlements" ON roomex_settlements FOR ALL USING (true) WITH CHECK (true);
`;
