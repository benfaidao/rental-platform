import { useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../contexts/AuthContext'
import { AlertTriangle, KeyRound } from 'lucide-react'
import { forceChangePassword } from '../api'
import toast from 'react-hot-toast'

function ForceChangePasswordOverlay() {
  const { updateUser } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return }
    if (password.length < 6) { toast.error('Mot de passe trop court (6 caractères minimum)'); return }
    setLoading(true)
    try {
      await forceChangePassword(password)
      updateUser({ mustChangePassword: false })
      toast.success('Mot de passe mis à jour')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Changement de mot de passe requis</h2>
          <p className="text-sm text-gray-500">Votre administrateur a réinitialisé votre mot de passe. Choisissez un nouveau mot de passe pour continuer.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label text-xs">Nouveau mot de passe</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
              autoFocus
              placeholder="Minimum 6 caractères"
            />
          </div>
          <div>
            <label className="label text-xs">Confirmer le mot de passe</label>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              minLength={6}
              required
              placeholder="Répétez le mot de passe"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Définir mon mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { agencyId } = useParams()
  const { user, isAgencySuspended, isSuperAdmin } = useAuth()
  const suspended = agencyId && !isSuperAdmin && isAgencySuspended(agencyId)

  return (
    <div className="flex h-screen bg-gray-50">
      {user?.mustChangePassword && <ForceChangePasswordOverlay />}
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
