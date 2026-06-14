import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminDashboard from './pages/admin/AdminDashboard'
import Agencies from './pages/admin/Agencies'
import Billing from './pages/admin/Billing'
import AdminContracts from './pages/admin/Contracts'
import Users from './pages/admin/Users'
import PlatformSettings from './pages/admin/PlatformSettings'
import AgencyDashboard from './pages/agency/AgencyDashboard'
import Cars from './pages/agency/Cars'
import CarDetail from './pages/agency/CarDetail'
import Contracts from './pages/agency/Contracts'
import NewContract from './pages/agency/NewContract'
import Financial from './pages/agency/Financial'
import Clients from './pages/agency/Clients'
import Partners from './pages/agency/Partners'
import Access from './pages/agency/Access'
import Chat from './pages/agency/Chat'
import RentalRequests from './pages/agency/RentalRequests'
import AgencySettings from './pages/agency/AgencySettings'
import Pricing from './pages/agency/Pricing'
import Planning from './pages/agency/Planning'
import NewClient from './pages/agency/NewClient'
import ContractView from './pages/ContractView'
import Landing from './pages/Landing'
import DemandeAcces from './pages/DemandeAcces'
import ConditionsUtilisation from './pages/ConditionsUtilisation'
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite'
import AnnulationRemboursement from './pages/AnnulationRemboursement'
import Layout from './components/Layout'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />
  return children
}

// Vérifie que l'utilisateur appartient à l'agence dans l'URL
function AgencyGuard({ children }) {
  const { user, loading } = useAuth()
  const { agencyId } = useParams()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (!user) return <Navigate to="/login" replace />
  // SUPER_ADMIN peut accéder à toutes les agences
  if (user.role === 'SUPER_ADMIN') return children
  const belongs = user.agencyUsers?.some(au => au.agencyId === agencyId)
  if (!belongs) {
    // Redirige vers la première agence de l'utilisateur
    const firstAgency = user.agencyUsers?.[0]?.agencyId
    return <Navigate to={firstAgency ? `/agency/${firstAgency}` : '/'} replace />
  }
  return children
}

function DefaultRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />
  const firstAgency = user.agencyUsers?.[0]?.agencyId
  if (firstAgency) return <Navigate to={`/agency/${firstAgency}`} replace />
  return <div className="flex items-center justify-center h-screen text-gray-500">Aucune agence assignée</div>
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <AuthProvider>
      <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/contract/:contractNumber" element={<ContractView />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Landing />} />
          <Route path="/demande-acces" element={<DemandeAcces />} />
          <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
          <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
          <Route path="/annulation-remboursement" element={<AnnulationRemboursement />} />
          <Route path="/admin" element={<PrivateRoute adminOnly><Layout /></PrivateRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="agencies" element={<Agencies />} />
            <Route path="contracts" element={<AdminContracts />} />
            <Route path="billing" element={<Billing />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<PlatformSettings />} />
          </Route>
          <Route path="/agency/:agencyId" element={<AgencyGuard><Layout /></AgencyGuard>}>
            <Route index element={<AgencyDashboard />} />
            <Route path="cars" element={<Cars />} />
            <Route path="cars/:carId" element={<CarDetail />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="contracts/new" element={<NewContract />} />
            <Route path="maintenance" element={<Navigate to="cars" replace />} />
            <Route path="checks" element={<Navigate to="financial" replace />} />
            <Route path="financial" element={<Financial />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/new" element={<NewClient />} />
            <Route path="history" element={<Navigate to="contracts" replace />} />
            <Route path="partners" element={<Partners />} />
            <Route path="external" element={<Navigate to="cars" replace />} />
            <Route path="calendar" element={<Navigate to="planning" replace />} />
            <Route path="planning" element={<Planning />} />
            <Route path="access" element={<Access />} />
            <Route path="chat" element={<Chat />} />
            <Route path="rental-requests" element={<RentalRequests />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="settings" element={<AgencySettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
    </GoogleOAuthProvider>
  )
}
