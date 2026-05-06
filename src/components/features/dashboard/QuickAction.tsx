interface Props {
  icon: React.ElementType
  label: string
  sub: string
  accent: 'blue' | 'purple' | 'red' | 'emerald'
  onClick: () => void
}

const ICON_COLORS: Record<Props['accent'], string> = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-300',
  red: 'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300',
}

export function QuickAction({ icon: Icon, label, sub, accent, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-app-border bg-app-surface p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-700"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${ICON_COLORS[accent]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-app-text">{label}</p>
        <p className="text-[11px] text-app-muted">{sub}</p>
      </div>
    </button>
  )
}
