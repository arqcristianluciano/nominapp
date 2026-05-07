import { Search } from 'lucide-react'

interface ProjectsSearchInputProps {
  value: string
  onChange: (value: string) => void
}

export function ProjectsSearchInput({ value, onChange }: ProjectsSearchInputProps) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
      <input
        type="text"
        placeholder="Buscar proyecto..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
      />
    </div>
  )
}
