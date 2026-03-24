import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
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
import PayrollPrint from '@/pages/PayrollPrint'
import PurchaseOrders from '@/pages/PurchaseOrders'
import PurchaseOrderDetail from '@/pages/PurchaseOrderDetail'
import ContractorDetail from '@/pages/ContractorDetail'
import ReportesObra from '@/pages/ReportesObra'

export const router = createBrowserRouter([
  // Página de impresión fuera del layout — sin sidebar ni header
  { path: '/nominas/:periodId/imprimir', element: <PayrollPrint /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'proyectos', element: <Projects /> },
      { path: 'proyectos/:projectId', element: <ProjectDetail /> },
      { path: 'proyectos/:projectId/nominas', element: <PayrollList /> },
      { path: 'proyectos/:projectId/control', element: <ControlFinanciero /> },
      { path: 'proyectos/:projectId/presupuesto', element: <PresupuestoDetalle /> },
      { path: 'proyectos/:projectId/calidad', element: <QualityControlPage /> },
      { path: 'proyectos/:projectId/cubicaciones', element: <CubicacionesPage /> },
      { path: 'nominas', element: <ReportesObra /> },
      { path: 'nominas/:periodId', element: <PayrollEditor /> },
      { path: 'finanzas', element: <FinanzasHub /> },
      { path: 'presupuesto', element: <PresupuestoHub /> },
      { path: 'cxp', element: <CxPHub /> },
      { path: 'cxp/consolidado', element: <CxPConsolidadoTodos /> },
      { path: 'cxp/:projectId', element: <CxPDetalle /> },
      { path: 'reportes', element: <Reportes /> },
      { path: 'contratistas', element: <Contractors /> },
      { path: 'contratistas/:contractorId', element: <ContractorDetail /> },
      { path: 'suplidores', element: <Suppliers /> },
      { path: 'configuracion', element: <Settings /> },
      { path: 'ordenes-compra', element: <PurchaseOrders /> },
      { path: 'ordenes-compra/:orderId', element: <PurchaseOrderDetail /> },
    ],
  },
])
