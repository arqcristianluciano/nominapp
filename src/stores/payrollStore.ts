import { create } from 'zustand'
import type { PayrollPeriod, LaborLineItem, MaterialInvoice } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface PayrollStore {
  periods: PayrollPeriod[]
  currentPeriod: PayrollPeriod | null
  laborItems: LaborLineItem[]
  materialInvoices: MaterialInvoice[]
  loading: boolean
  error: string | null
  fetchPeriods: (projectId: string) => Promise<void>
  fetchPeriodDetail: (periodId: string) => Promise<void>
  setCurrentPeriod: (period: PayrollPeriod | null) => void
}

export const usePayrollStore = create<PayrollStore>((set) => ({
  periods: [],
  currentPeriod: null,
  laborItems: [],
  materialInvoices: [],
  loading: false,
  error: null,

  fetchPeriods: async (projectId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('project_id', projectId)
      .order('period_number', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ periods: data || [], loading: false })
    }
  },

  fetchPeriodDetail: async (periodId) => {
    set({ loading: true, error: null })

    const [periodRes, laborRes, materialsRes] = await Promise.all([
      supabase.from('payroll_periods').select('*, project:projects(*)').eq('id', periodId).single(),
      supabase.from('labor_line_items').select('*, contractor:contractors(*)').eq('payroll_period_id', periodId).order('sort_order'),
      supabase.from('material_invoices').select('*, supplier:suppliers(*)').eq('payroll_period_id', periodId),
    ])

    if (periodRes.error) {
      set({ error: periodRes.error.message, loading: false })
    } else {
      set({
        currentPeriod: periodRes.data,
        laborItems: laborRes.data || [],
        materialInvoices: materialsRes.data || [],
        loading: false,
      })
    }
  },

  setCurrentPeriod: (period) => set({ currentPeriod: period }),
}))
