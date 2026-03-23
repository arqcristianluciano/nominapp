import { create } from 'zustand'
import type { Project } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface ProjectStore {
  projects: Project[]
  selectedProject: Project | null
  loading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  selectProject: (project: Project | null) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  selectedProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('projects')
      .select('*, company:companies(*)')
      .order('name')

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ projects: data || [], loading: false })
    }
  },

  selectProject: (project) => set({ selectedProject: project }),
}))
