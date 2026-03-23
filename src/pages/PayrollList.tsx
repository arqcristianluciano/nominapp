import { Navigate, useParams } from 'react-router-dom'

export default function PayrollList() {
  const { projectId } = useParams()
  return <Navigate to={`/proyectos/${projectId}`} replace />
}
