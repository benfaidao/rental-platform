import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { resetPassword } from '../api'
import { KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center space-y-4">
          <p className="text-red-600 font-medium">Lien invalide ou manquant.</p>
          <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm">
            Faire une nouvelle demande
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, form.newPassword)
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lien invalide ou expiré')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Nouveau mot de passe</h1>
          <p className="text-gray-500 text-sm mt-1">Choisissez un nouveau mot de passe sécurisé.</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">Mot de passe réinitialisé avec succès !</p>
            </div>
            <p className="text-sm text-gray-500">Redirection vers la connexion dans 3 secondes...</p>
            <Link to="/login" className="text-blue-600 hover:underline text-sm block">
              Se connecter maintenant
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Minimum 6 caractères"
                  value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  minLength={6}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                placeholder="Répétez le mot de passe"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                minLength={6}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
