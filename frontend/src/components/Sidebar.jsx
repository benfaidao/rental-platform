import { NavLink, useParams, useNavigate, Link } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useQuery } from '@tanstack/react-query'
import { getRentalRequestStats, getChatUnread } from '../api'
import {
  LayoutDashboard, Building2, CreditCard, Users, Car, FileText,
  DollarSign, ChevronDown, LogOut, Settings, UserCheck, Briefcase, MessageSquare, ArrowLeftRight, Tag, CalendarDays, MonitorPlay,
} from 'lucide-react'
import { useState } from 'react'

const adminLinks = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/agencies', label: 'Agences', icon: Building2 },
  { to: '/admin/contracts', label: 'Contrats', icon: FileText },
  { to: '/admin/billing', label: 'Facturation', icon: CreditCard },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/demo-requests', label: 'Demandes démo', icon: MonitorPlay },
  { to: '/admin/settings', label: 'Paramètres', icon: Settings },
]

const agencyLinks = (agencyId) => [
  { to: `/agency/${agencyId}`, label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: `/agency/${agencyId}/contracts`, label: 'Réservations', icon: FileText },
  { to: `/agency/${agencyId}/clients`, label: 'Clients', icon: UserCheck },
  { to: `/agency/${agencyId}/cars`, label: 'Véhicules', icon: Car },
  { to: `/agency/${agencyId}/financial`, label: 'Finances', icon: DollarSign },
  { to: `/agency/${agencyId}/partners`, label: 'Partenaires', icon: Briefcase },
  { to: `/agency/${agencyId}/rental-requests`, label: 'Demandes location', icon: ArrowLeftRight },
  { to: `/agency/${agencyId}/planning`, label: 'Planning', icon: CalendarDays },
  { to: `/agency/${agencyId}/pricing`, label: 'Tarification', icon: Tag },
  { to: `/agency/${agencyId}/chat`, label: 'Messagerie', icon: MessageSquare },
]

export default function Sidebar({ onClose }) {
  const { user, logout, isSuperAdmin, getUserAgencies } = useAuth()
  const { totalUnread } = useSocket()
  const { agencyId } = useParams()
  const navigate = useNavigate()
  const [agencyOpen, setAgencyOpen] = useState(false)

  const agencies = getUserAgencies()
  const currentAgency = agencies.find(a => a.id === agencyId)
  const links = isSuperAdmin ? adminLinks : agencyLinks(agencyId || agencies[0]?.id || '')

  const { data: reqStats } = useQuery({
    queryKey: ['rentalRequestStats', agencyId],
    queryFn: () => getRentalRequestStats(agencyId).then(r => r.data),
    enabled: !isSuperAdmin && !!agencyId,
    refetchInterval: 30000,
  })

  const { data: unreadData } = useQuery({
    queryKey: ['chatUnread'],
    queryFn: () => getChatUnread().then(r => r.data),
    enabled: !!user,
    refetchInterval: 30000,
  })

  const effectiveUnread = Math.max(totalUnread, unreadData?.total ?? 0)

  return (
    <div className="w-64 h-full bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <Link to="/">
          <Logo size="sm" dark />
        </Link>
      </div>

      {!isSuperAdmin && agencies.length > 1 && (
        <div className="p-3 border-b border-gray-700">
          <button
            onClick={() => setAgencyOpen(!agencyOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800"
          >
            <span className="truncate">{currentAgency?.name || 'Choisir agence'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${agencyOpen ? 'rotate-180' : ''}`} />
          </button>
          {agencyOpen && (
            <div className="mt-1 space-y-1">
              {agencies.map(a => (
                <button
                  key={a.id}
                  onClick={() => { navigate(`/agency/${a.id}`); setAgencyOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs ${a.id === agencyId ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!isSuperAdmin && agencies.length === 1 && (
        <div className="px-5 py-3 border-b border-gray-700">
          <p className="text-xs text-gray-500">Agence</p>
          <p className="text-sm text-gray-200 font-medium truncate">{currentAgency?.name || agencies[0]?.name}</p>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map(link => {
          const isChat = link.label === 'Messagerie'
          const isRequests = link.label === 'Demandes location'
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <link.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{link.label}</span>
              {isChat && effectiveUnread > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {effectiveUnread > 9 ? '9+' : effectiveUnread}
                </span>
              )}
              {isRequests && reqStats && (
                <span className="flex items-center gap-1">
                  {reqStats.pendingDecisions > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center" title="Offres à décider">
                      {reqStats.pendingDecisions > 9 ? '9+' : reqStats.pendingDecisions}
                    </span>
                  )}
                  {reqStats.incomingNotAnswered > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-blue-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center" title="Demandes sans réponse">
                      {reqStats.incomingNotAnswered > 9 ? '9+' : reqStats.incomingNotAnswered}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-700">
        {!isSuperAdmin && agencyId ? (
          <NavLink
            to={`/agency/${agencyId}/settings`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <Settings className="w-4 h-4 shrink-0 text-gray-500" />
          </NavLink>
        ) : (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-gray-500">Connecté</p>
            <p className="text-sm text-gray-200 font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}
