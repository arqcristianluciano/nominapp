import { Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireDirector } from '@/components/auth/RequireDirector'
import { RequireAppCapability } from '@/components/auth/RequireAppCapability'
import { AppLayout } from '@/components/layout/AppLayout'
import RouterErrorBoundary from '@/components/RouterErrorBoundary'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import { lazyWithRetry } from '@/utils/lazyWithRetry'

const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'))
const Projects = lazyWithRetry(() => import('@/pages/Projects'))
const ProjectDetail = lazyWithRetry(() => import('@/pages/ProjectDetail'))
const PayrollList = lazyWithRetry(() => import('@/pages/PayrollList'))
const PayrollEditor = lazyWithRetry(() => import('@/pages/PayrollEditor'))
const ControlFinanciero = lazyWithRetry(() => import('@/pages/ControlFinanciero'))
const PresupuestoDetalle = lazyWithRetry(() => import('@/pages/PresupuestoDetalle'))
const FinanzasHub = lazyWithRetry(() => import('@/pages/FinanzasHub'))
const PresupuestoHub = lazyWithRetry(() => import('@/pages/PresupuestoHub'))
const CxPHub = lazyWithRetry(() => import('@/pages/CxPHub'))
const CxPDetalle = lazyWithRetry(() => import('@/pages/CxPDetalle'))
const CxPConsolidadoTodos = lazyWithRetry(() => import('@/pages/CxPConsolidadoTodos'))
const Reportes = lazyWithRetry(() => import('@/pages/Reportes'))
const Contractors = lazyWithRetry(() => import('@/pages/Contractors'))
const Suppliers = lazyWithRetry(() => import('@/pages/Suppliers'))
const Settings = lazyWithRetry(() => import('@/pages/Settings'))
const QualityControlPage = lazyWithRetry(() => import('@/pages/QualityControlPage'))
const CubicacionesPage = lazyWithRetry(() => import('@/pages/CubicacionesPage'))
const CubicacionesHub = lazyWithRetry(() => import('@/pages/CubicacionesHub'))
const CubicacionContratoPage = lazyWithRetry(() => import('@/pages/CubicacionContratoPage'))
const CubicacionImprimirPage = lazyWithRetry(() => import('@/pages/CubicacionImprimirPage'))
const ContratoFirmaPage = lazyWithRetry(() => import('@/pages/ContratoFirmaPage'))
const PayrollPrint = lazyWithRetry(() => import('@/pages/PayrollPrint'))
const PurchaseOrders = lazyWithRetry(() => import('@/pages/PurchaseOrders'))
const PurchaseOrderDetail = lazyWithRetry(() => import('@/pages/PurchaseOrderDetail'))
const ContractorDetail = lazyWithRetry(() => import('@/pages/ContractorDetail'))
const ReportesObra = lazyWithRetry(() => import('@/pages/ReportesObra'))
const Loans = lazyWithRetry(() => import('@/pages/Loans'))
const InsumosPage = lazyWithRetry(() => import('@/pages/InsumosPage'))
const Calendario = lazyWithRetry(() => import('@/pages/Calendario'))
const BitacoraPage = lazyWithRetry(() => import('@/pages/BitacoraPage'))
const AsistenciaPage = lazyWithRetry(() => import('@/pages/AsistenciaPage'))
const InventarioPage = lazyWithRetry(() => import('@/pages/InventarioPage'))
const CronogramaPage = lazyWithRetry(() => import('@/pages/CronogramaPage'))
const HistorialPrecios = lazyWithRetry(() => import('@/pages/HistorialPrecios'))
const MaterialsCatalogPage = lazyWithRetry(() => import('@/pages/MaterialsCatalogPage'))
const DirectorDashboard = lazyWithRetry(() => import('@/pages/DirectorDashboard'))
const CubicacionMensualPage = lazyWithRetry(() => import('@/pages/CubicacionMensualPage'))
const FlujoCajaPage = lazyWithRetry(() => import('@/pages/FlujoCajaPage'))
const AvancesPage = lazyWithRetry(() => import('@/pages/AvancesPage'))
const AprobacionesPage = lazyWithRetry(() => import('@/pages/AprobacionesPage'))
const AdminUsuarios = lazyWithRetry(() => import('@/pages/AdminUsuarios'))

function withSuspense(Component: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-app-muted">Cargando...</div>}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login />, errorElement: <RouterErrorBoundary /> },
  { path: '*', element: <NotFound />, errorElement: <RouterErrorBoundary /> },
  {
    path: '/',
    element: <RequireAuth />,
    errorElement: <RouterErrorBoundary />,
    children: [
      // Impresión sin sidebar — requiere sesión
      { path: 'nominas/:periodId/imprimir', element: withSuspense(PayrollPrint) },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: withSuspense(Dashboard) },
          { path: 'projects', element: <Navigate to="/proyectos" replace /> },
          { path: 'proyectos', element: withSuspense(Projects) },
          { path: 'proyectos/:projectId', element: withSuspense(ProjectDetail) },
          { path: 'proyectos/:projectId/nominas', element: withSuspense(PayrollList) },
          { path: 'proyectos/:projectId/control', element: withSuspense(ControlFinanciero) },
          { path: 'proyectos/:projectId/presupuesto', element: withSuspense(PresupuestoDetalle) },
          { path: 'proyectos/:projectId/calidad', element: withSuspense(QualityControlPage) },
          { path: 'proyectos/:projectId/insumos', element: withSuspense(InsumosPage) },
          { path: 'cubicaciones', element: withSuspense(CubicacionesHub) },
          { path: 'proyectos/:projectId/cubicaciones', element: withSuspense(CubicacionesPage) },
          { path: 'proyectos/:projectId/cubicaciones/:contratoId', element: withSuspense(CubicacionContratoPage) },
          {
            path: 'proyectos/:projectId/cubicaciones/:contratoId/imprimir',
            element: withSuspense(CubicacionImprimirPage),
          },
          { path: 'proyectos/:projectId/cubicaciones/:contratoId/contrato', element: withSuspense(ContratoFirmaPage) },
          { path: 'nominas', element: withSuspense(ReportesObra) },
          { path: 'nominas/:periodId', element: withSuspense(PayrollEditor) },
          { path: 'finanzas', element: withSuspense(FinanzasHub) },
          { path: 'presupuesto', element: withSuspense(PresupuestoHub) },
          { path: 'cxp', element: withSuspense(CxPHub) },
          { path: 'cxp/consolidado', element: withSuspense(CxPConsolidadoTodos) },
          { path: 'cxp/:projectId', element: withSuspense(CxPDetalle) },
          { path: 'contratistas', element: withSuspense(Contractors) },
          { path: 'contratistas/:contractorId', element: withSuspense(ContractorDetail) },
          { path: 'suplidores', element: withSuspense(Suppliers) },
          { path: 'configuracion', element: withSuspense(Settings) },
          { path: 'ordenes-compra', element: withSuspense(PurchaseOrders) },
          { path: 'ordenes-compra/:orderId', element: withSuspense(PurchaseOrderDetail) },
          { path: 'calendario', element: withSuspense(Calendario) },
          {
            element: <RequireAppCapability capability="canViewPriceHistory" />,
            children: [{ path: 'historial-precios', element: withSuspense(HistorialPrecios) }],
          },
          {
            element: <RequireAppCapability capability="canViewReportes" />,
            children: [{ path: 'reportes', element: withSuspense(Reportes) }],
          },
          {
            element: <RequireAppCapability capability="canWriteLoans" />,
            children: [{ path: 'prestamos', element: withSuspense(Loans) }],
          },
          { path: 'proyectos/:projectId/bitacora', element: withSuspense(BitacoraPage) },
          { path: 'proyectos/:projectId/asistencia', element: withSuspense(AsistenciaPage) },
          { path: 'proyectos/:projectId/inventario', element: withSuspense(InventarioPage) },
          { path: 'proyectos/:projectId/cronograma', element: withSuspense(CronogramaPage) },
          { path: 'proyectos/:projectId/cubicacion-mensual', element: withSuspense(CubicacionMensualPage) },
          { path: 'proyectos/:projectId/flujo-caja', element: withSuspense(FlujoCajaPage) },
          { path: 'proyectos/:projectId/avances', element: withSuspense(AvancesPage) },
          { path: 'materiales', element: withSuspense(MaterialsCatalogPage) },
          {
            element: <RequireDirector />,
            children: [{ path: 'director', element: withSuspense(DirectorDashboard) }],
          },
          {
            element: <RequireAppCapability capability="canViewApprovalsLog" />,
            children: [{ path: 'aprobaciones', element: withSuspense(AprobacionesPage) }],
          },
          {
            element: <RequireAppCapability capability="canManageUsers" />,
            children: [{ path: 'admin/usuarios', element: withSuspense(AdminUsuarios) }],
          },
        ],
      },
    ],
  },
])
