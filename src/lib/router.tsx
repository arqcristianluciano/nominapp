/* eslint-disable react-refresh/only-export-components */
import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireDirector } from '@/components/auth/RequireDirector'
import { RequireAppCapability } from '@/components/auth/RequireAppCapability'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Projects = lazy(() => import('@/pages/Projects'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const PayrollList = lazy(() => import('@/pages/PayrollList'))
const PayrollEditor = lazy(() => import('@/pages/PayrollEditor'))
const ControlFinanciero = lazy(() => import('@/pages/ControlFinanciero'))
const PresupuestoDetalle = lazy(() => import('@/pages/PresupuestoDetalle'))
const FinanzasHub = lazy(() => import('@/pages/FinanzasHub'))
const PresupuestoHub = lazy(() => import('@/pages/PresupuestoHub'))
const CxPHub = lazy(() => import('@/pages/CxPHub'))
const CxPDetalle = lazy(() => import('@/pages/CxPDetalle'))
const CxPConsolidadoTodos = lazy(() => import('@/pages/CxPConsolidadoTodos'))
const Reportes = lazy(() => import('@/pages/Reportes'))
const Contractors = lazy(() => import('@/pages/Contractors'))
const Suppliers = lazy(() => import('@/pages/Suppliers'))
const Settings = lazy(() => import('@/pages/Settings'))
const QualityControlPage = lazy(() => import('@/pages/QualityControlPage'))
const CubicacionesPage = lazy(() => import('@/pages/CubicacionesPage'))
const CubicacionesHub = lazy(() => import('@/pages/CubicacionesHub'))
const CubicacionContratoPage = lazy(() => import('@/pages/CubicacionContratoPage'))
const CubicacionImprimirPage = lazy(() => import('@/pages/CubicacionImprimirPage'))
const ContratoFirmaPage = lazy(() => import('@/pages/ContratoFirmaPage'))
const PayrollPrint = lazy(() => import('@/pages/PayrollPrint'))
const PurchaseOrders = lazy(() => import('@/pages/PurchaseOrders'))
const PurchaseOrderDetail = lazy(() => import('@/pages/PurchaseOrderDetail'))
const ContractorDetail = lazy(() => import('@/pages/ContractorDetail'))
const ReportesObra = lazy(() => import('@/pages/ReportesObra'))
const Loans = lazy(() => import('@/pages/Loans'))
const InsumosPage = lazy(() => import('@/pages/InsumosPage'))
const Calendario = lazy(() => import('@/pages/Calendario'))
const BitacoraPage = lazy(() => import('@/pages/BitacoraPage'))
const AsistenciaPage = lazy(() => import('@/pages/AsistenciaPage'))
const InventarioPage = lazy(() => import('@/pages/InventarioPage'))
const CronogramaPage = lazy(() => import('@/pages/CronogramaPage'))
const HistorialPrecios = lazy(() => import('@/pages/HistorialPrecios'))
const MaterialsCatalogPage = lazy(() => import('@/pages/MaterialsCatalogPage'))
const DirectorDashboard = lazy(() => import('@/pages/DirectorDashboard'))
const CubicacionMensualPage = lazy(() => import('@/pages/CubicacionMensualPage'))
const FlujoCajaPage = lazy(() => import('@/pages/FlujoCajaPage'))
const AvancesPage = lazy(() => import('@/pages/AvancesPage'))
const AprobacionesPage = lazy(() => import('@/pages/AprobacionesPage'))
const AdminUsuarios = lazy(() => import('@/pages/AdminUsuarios'))

function withSuspense(Component: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-app-muted">Cargando...</div>}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '*', element: <NotFound /> },
  {
    path: '/',
    element: <RequireAuth />,
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
          { path: 'proyectos/:projectId/cubicaciones/:contratoId/imprimir', element: withSuspense(CubicacionImprimirPage) },
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
            children: [
              { path: 'historial-precios', element: withSuspense(HistorialPrecios) },
            ],
          },
          {
            element: <RequireAppCapability capability="canViewReportes" />,
            children: [
              { path: 'reportes', element: withSuspense(Reportes) },
            ],
          },
          {
            element: <RequireAppCapability capability="canWriteLoans" />,
            children: [
              { path: 'prestamos', element: withSuspense(Loans) },
            ],
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
            children: [
              { path: 'director', element: withSuspense(DirectorDashboard) },
            ],
          },
          {
            element: <RequireAppCapability capability="canViewApprovalsLog" />,
            children: [
              { path: 'aprobaciones', element: withSuspense(AprobacionesPage) },
            ],
          },
          {
            element: <RequireAppCapability capability="canManageUsers" />,
            children: [
              { path: 'admin/usuarios', element: withSuspense(AdminUsuarios) },
            ],
          },
        ],
      },
    ],
  },
])
