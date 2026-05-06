import { Cloud, CloudRain, Sun } from 'lucide-react'
import type { BitacoraFormData } from '@/services/bitacoraService'

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
  created_by: 'Admin',
}
