import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { login as apiLogin } from '../api'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiLogin(form)
      login(res.data.token, res.data.user)
      if (res.data.user.role === 'SUPER_ADMIN') {
        navigate('/admin')
      } else {
        const agencyId = res.data.user.agencyUsers?.[0]?.agencyId
        navigate(agencyId ? `/agency/${agencyId}` : '/')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Pilotez votre flotte comme un cockpit</h2>
        <p className="text-blue-100 text-sm mt-2">Gérez vos véhicules, contrats et finances depuis une seule plateforme</p>
        <p className="text-blue-100 text-sm mt-1">
          Contactez-nous au{' '}
          <a href="tel:+212672491389" className="text-white font-medium hover:underline">+212 672 491 389</a>
          {' '}ou{' '}
          <a href="tel:+33751970713" className="text-white font-medium hover:underline">+33 751 970 713</a>
        </p>
      </div>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🚗</div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion Location</h1>
          <p className="text-gray-500 text-sm mt-1">Plateforme de gestion des agences</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="admin@rental.ma"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </div>
  )
}
