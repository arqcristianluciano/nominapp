import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Dashboard from '@/pages/Dashboard'
import Projects from '@/pages/Projects'
import ProjectDetail from '@/pages/ProjectDetail'
import PayrollList from '@/pages/PayrollList'
import PayrollEditor from '@/pages/PayrollEditor'
import ControlFinanciero from '@/pages/ControlFinanciero'
import PresupuestoDetalle from '@/pages/PresupuestoDetalle'
import FinanzasHub from '@/pages/FinanzasHub'
import PresupuestoHub from '@/pages/PresupuestoHub'
import CxPHub from '@/pages/CxPHub'
import CxPDetalle from '@/pages/CxPDetalle'
import CxPConsolidadoTodos from '@/pages/CxPConsolidadoTodos'
import Reportes from '@/pages/Reportes'
import Contractors from '@/pages/Contractors'
import Suppliers from '@/pages/Suppliers'
import Settings from '@/pages/Settings'
import QualityControlPage from '@/pages/QualityControlPage'
import CubicacionesPage from '@/pages/CubicacionesPage'
import CubicacionesHub from '@/pages/CubicacionesHub'
import CubicacionContratoPage from '@/pages/CubicacionContratoPage'
import CubicacionImprimirPage from '@/pages/CubicacionImprimirPage'
import ContratoFirmaPage from '@/pages/ContratoFirmaPage'
import PayrollPrint from '@/pages/PayrollPrint'
import PurchaseOrders from '@/pages/PurchaseOrders'
import PurchaseOrderDetail from '@/pages/PurchaseOrderDetail'
import ContractorDetail from '@/pages/ContractorDetail'
import ReportesObra from '@/pages/ReportesObra'
import Loans from '@/pages/Loans'
import InsumosPage from '@/pages/InsumosPage'
import Calendario from '@/pages/Calendario'
import BitacoraPage from '@/pages/BitacoraPage'
import AsistenciaPage from '@/pages/AsistenciaPage'
import InventarioPage from '@/pages/InventarioPage'
import CronogramaPage from '@/pages/CronogramaPage'
import HistorialPrecios from '@/pages/HistorialPrecios'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '*', element: <NotFound /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      // Impresión sin sidebar — requiere sesión
      { path: 'nominas/:periodId/imprimir', element: <PayrollPrint /> },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'proyectos', element: <Projects /> },
          { path: 'proyectos/:projectId', element: <ProjectDetail /> },
          { path: 'proyectos/:projectId/nominas', element: <PayrollList /> },
          { path: 'proyectos/:projectId/control', element: <ControlFinanciero /> },
          { path: 'proyectos/:projectId/presupuesto', element: <PresupuestoDetalle /> },
          { path: 'proyectos/:projectId/calidad', element: <QualityControlPage /> },
          { path: 'proyectos/:projectId/insumos', element: <InsumosPage /> },
          { path: 'cubicaciones', element: <CubicacionesHub /> },
          { path: 'proyectos/:projectId/cubicaciones', element: <CubicacionesPage /> },
          { path: 'proyectos/:projectId/cubicaciones/:contratoId', element: <CubicacionContratoPage /> },
          { path: 'proyectos/:projectId/cubicaciones/:contratoId/imprimir', element: <CubicacionImprimirPage /> },
          { path: 'proyectos/:projectId/cubicaciones/:contratoId/contrato', element: <ContratoFirmaPage /> },
          { path: 'nominas', element: <ReportesObra /> },
          { path: 'nominas/:periodId', element: <PayrollEditor /> },
          { path: 'finanzas', element: <FinanzasHub /> },
          { path: 'presupuesto', element: <PresupuestoHub /> },
          { path: 'cxp', element: <CxPHub /> },
          { path: 'cxp/consolidado', element: <CxPConsolidadoTodos /> },
          { path: 'cxp/:projectId', element: <CxPDetalle /> },
          { path: 'reportes', element: <Reportes /> },
          { path: 'prestamos', element: <Loans /> },
          { path: 'contratistas', element: <Contractors /> },
          { path: 'contratistas/:contractorId', element: <ContractorDetail /> },
          { path: 'suplidores', element: <Suppliers /> },
          { path: 'configuracion', element: <Settings /> },
          { path: 'ordenes-compra', element: <PurchaseOrders /> },
          { path: 'ordenes-compra/:orderId', element: <PurchaseOrderDetail /> },
          { path: 'calendario', element: <Calendario /> },
          { path: 'historial-precios', element: <HistorialPrecios /> },
          { path: 'proyectos/:projectId/bitacora', element: <BitacoraPage /> },
          { path: 'proyectos/:projectId/asistencia', element: <AsistenciaPage /> },
          { path: 'proyectos/:projectId/inventario', element: <InventarioPage /> },
          { path: 'proyectos/:projectId/cronograma', element: <CronogramaPage /> },
        ],
      },
    ],
  },
])
