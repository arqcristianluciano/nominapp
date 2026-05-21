import { RouterProvider } from 'react-router-dom'
import { router } from '@/lib/router'
import { ToastProvider } from '@/components/ui/Toast'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import OfflineIndicator from '@/components/pwa/OfflineIndicator'

export default function App() {
  return (
    <ToastProvider>
      <OfflineIndicator />
      <RouterProvider router={router} />
      <InstallPrompt />
    </ToastProvider>
  )
}
