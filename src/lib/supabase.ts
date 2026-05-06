import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { mockSupabase } from './mockSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const isDemo = !supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co'

// El mock implementa la API mínima que usa la app; en runtime se comporta como SupabaseClient.
export const supabase: SupabaseClient = isDemo
  ? (mockSupabase as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseAnonKey)

export const isDemoMode = isDemo
