import { RouterProvider } from 'react-router-dom'
import { router } from '@/lib/router'
import { ToastProvider } from '@/components/ui/Toast'

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
