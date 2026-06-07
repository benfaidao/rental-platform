import { useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../contexts/AuthContext'
import { AlertTriangle } from 'lucide-react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { agencyId } = useParams()
  const { isAgencySuspended, isSuperAdmin } = useAuth()
  const suspended = agencyId && !isSuperAdmin && isAgencySuspended(agencyId)

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(v => !v)} />

        {suspended && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              Cette agence est suspendue — accès en lecture seule. Vous pouvez consulter les données et télécharger les documents, mais aucune modification n'est possible.
            </p>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
