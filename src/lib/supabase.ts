import { createClient } from '@supabase/supabase-js'
import { mockSupabase } from './mockSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Use mock when no real Supabase credentials are configured
const isDemo = !supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co'

export const supabase: any = isDemo
  ? mockSupabase
  : createClient(supabaseUrl, supabaseAnonKey)

export const isDemoMode = isDemo
