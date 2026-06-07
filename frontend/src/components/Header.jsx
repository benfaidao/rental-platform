import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const routeTitles = {
  '/admin': 'Tableau de bord',
  '/admin/agencies': 'Gestion des Agences',
  '/admin/billing': 'Facturation',
  '/admin/users': 'Utilisateurs',
  'dashboard': 'Tableau de bord',
  'cars': 'Véhicules',
  'contracts': 'Contrats de Location',
  'maintenance': 'Maintenance',
  'checks': 'Gestion des Chèques',
  'financial': 'Finances',
}

export default function Header({ onMenuToggle }) {
  const { pathname } = useLocation()
  const { user } = useAuth()

  const segments = pathname.split('/')
  const last = segments[segments.length - 1]
  const title = routeTitles[pathname] || routeTitles[last] || 'Gestion'

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.firstName} {user?.lastName}
        </span>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  )
}
