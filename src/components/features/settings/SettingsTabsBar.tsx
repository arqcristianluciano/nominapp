import { SETTINGS_TABS, type SettingsTab } from '@/components/features/settings/settingsTabs'
import { useAppRoles } from '@/hooks/useAppRoles'

interface SettingsTabsBarProps {
  activeTab: SettingsTab
  onChange: (tab: SettingsTab) => void
}

export function SettingsTabsBar({ activeTab, onChange }: SettingsTabsBarProps) {
  const { isDirector } = useAppRoles()
  const visibleTabs = SETTINGS_TABS.filter((tab) => !tab.directorOnly || isDirector)

  return (
    <div className="flex gap-0 border-b border-app-border">
      {visibleTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-app-muted hover:text-app-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
