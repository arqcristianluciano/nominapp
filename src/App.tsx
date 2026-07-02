import { RouterProvider } from 'react-router-dom'
import { router } from '@/lib/router'
import { ToastProvider } from '@/components/ui/Toast'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import UpdatePrompt from '@/components/pwa/UpdatePrompt'

// Nota: el aviso "Sin conexión" (y el contador de cambios pendientes) lo
// muestra AppLayout de forma informativa. Antes había además un banner rojo
// fijo (OfflineIndicator) que se superponía arriba y duplicaba el aviso; se
// eliminó para no mostrar dos avisos a la vez.
export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
      <InstallPrompt />
      <UpdatePrompt />
    </ToastProvider>
  )
}
