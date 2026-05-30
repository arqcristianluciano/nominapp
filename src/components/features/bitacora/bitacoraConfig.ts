import { Cloud, CloudRain, Sun } from 'lucide-react'
import type { BitacoraEntry, BitacoraFormData } from '@/services/bitacoraService'

export const WEATHER_OPTIONS = [
  { value: 'soleado', label: 'Soleado', icon: Sun },
  { value: 'nublado', label: 'Nublado', icon: Cloud },
  { value: 'lluvia', label: 'Lluvia', icon: CloudRain },
  { value: 'parcial', label: 'Parcial', icon: Cloud },
]

export const EMPTY_BITACORA_FORM: BitacoraFormData = {
  project_id: '',
  date: new Date().toISOString().split('T')[0],
  weather: 'soleado',
  temp_c: 30,
  work_summary: '',
  workforce_count: 0,
  equipment: '',
  visitors: '',
  incidents: '',
  notes: '',
  photo_url: null,
  created_by: 'Admin',
}

export function createBitacoraForm(projectId: string): BitacoraFormData {
  return { ...EMPTY_BITACORA_FORM, project_id: projectId }
}

export function buildBitacoraFormFromEntry(entry: BitacoraEntry): BitacoraFormData {
  return {
    project_id: entry.project_id,
    date: entry.date,
    weather: entry.weather,
    temp_c: entry.temp_c,
    work_summary: entry.work_summary,
    workforce_count: entry.workforce_count,
    equipment: entry.equipment ?? '',
    visitors: entry.visitors ?? '',
    incidents: entry.incidents ?? '',
    notes: entry.notes ?? '',
    photo_url: entry.photo_url,
    created_by: entry.created_by,
  }
}
