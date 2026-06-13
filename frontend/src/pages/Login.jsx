import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { login as apiLogin } from '../api'
import { GoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || '/api'

const trustFeatures = [
  { icon: '🏠', title: 'Tout centralisé', desc: 'Gérez tout en un seul endroit' },
  { icon: '🔒', title: 'Données sécurisées', desc: 'Hébergé en Europe & sauvegarde incluse' },
  { icon: '🔔', title: 'Alertes intelligentes', desc: 'Ne manquez aucun rappel important' },
  { icon: '📊', title: 'Rapports avancés', desc: 'Analysez et développez votre agence' },
]

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const redirect = (user) => {
    if (user.role === 'SUPER_ADMIN') return navigate('/admin')
    const agencyId = user.agencyUsers?.[0]?.agencyId
    navigate(agencyId ? `/agency/${agencyId}` : '/')
  }

  const handleGoogle = async (credentialResponse) => {
    setGoogleLoading(true)
    try {
      const res = await axios.post(`${API}/auth/google`, { credential: credentialResponse.credential })
      login(res.data.token, res.data.user)
      redirect(res.data.user)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Connexion Google échouée')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiLogin(form)
      login(res.data.token, res.data.user)
      redirect(res.data.user)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Formulaire — affiché en premier sur mobile ── */}
      <div className="lg:w-2/5 lg:order-2 bg-white flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm">

          {/* Logo — mobile uniquement (le panneau gauche est caché sur mobile) */}
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>

          {/* En-tête formulaire */}
          <div className="mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg">
              🔑
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Connexion</h3>
            <p className="text-gray-500 text-sm mt-1">Accédez à votre espace agence</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Adresse email</label>
              <input
                type="email"
                className="input"
                placeholder="vous@agence.ma"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
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
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter →'}
            </button>
          </form>

          <div className="text-center mt-5">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>

          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className={`flex justify-center ${googleLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                <GoogleLogin
                  onSuccess={handleGoogle}
                  onError={() => toast.error('Connexion Google annulée')}
                  text="signin_with"
                  shape="rectangular"
                  locale="fr"
                  width="320"
                />
              </div>
            </>
          )}

          {/* Trust badges */}
          <div className="mt-8 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: '🔒', label: 'Données sécurisées' },
              { icon: '📞', label: 'Support inclus' },
              { icon: '✅', label: 'Sans engagement' },
            ].map(b => (
              <div key={b.label} className="bg-gray-50 rounded-xl py-3 px-2">
                <div className="text-lg mb-1">{b.icon}</div>
                <p className="text-xs text-gray-500 leading-tight">{b.label}</p>
              </div>
            ))}
          </div>

          {/* Lien démo */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Pas encore client ?{' '}
              <Link to="/" className="text-blue-600 hover:underline font-medium">
                Demander une démo gratuite
              </Link>
            </p>
          </div>

          {/* Contact mobile */}
          <div className="flex lg:hidden flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
            <a href="tel:+212672491389" className="text-xs text-gray-400 hover:text-gray-600">📞 +212 672 491 389</a>
            <a href="tel:+33751970713" className="text-xs text-gray-400 hover:text-gray-600">📞 +33 751 970 713</a>
          </div>

          <p className="text-center text-xs text-gray-300 mt-4">
            MobilisCar.com — Gestion de location de véhicules
          </p>
        </div>
      </div>

      {/* ── Panneau marketing — caché sur mobile ── */}
      <div className="hidden lg:flex lg:w-3/5 lg:order-1 bg-gradient-to-br from-[#0f2a5e] via-[#1a3f8f] to-[#1e56c0] flex-col justify-between p-12 text-white">
        <div>
          {/* Logo */}
          <Logo size="lg" dark className="mb-2" />

          <div className="mt-10">
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full mb-5 tracking-wide">
              🔒 Plateforme sécurisée &amp; professionnelle
            </span>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight">
              Pilotez toute votre<br />
              <span className="text-blue-300">activité location</span><br />
              depuis un espace sécurisé.
            </h2>
            <p className="text-blue-100 mt-4 text-sm leading-relaxed max-w-md">
              Réservations, véhicules, clients, contrats, paiements, entretien et rapports — tout centralisé avec des données sécurisées.
            </p>
          </div>

          {/* Trust features */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {trustFeatures.map(f => (
              <div key={f.title} className="flex items-start gap-3 bg-white/8 rounded-xl p-3.5 border border-white/10">
                <span className="text-xl leading-none mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-blue-200 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* RGPD / sécurité */}
          <div className="mt-6 bg-white/8 rounded-xl p-4 border border-white/10 flex items-start gap-3">
            <span className="text-xl shrink-0">🛡️</span>
            <div>
              <p className="font-semibold text-sm">Votre sécurité est notre priorité</p>
              <p className="text-blue-200 text-xs mt-1 leading-relaxed">
                Vos données sont confidentielles et ne seront jamais partagées.<br />
                <span className="text-blue-300 font-medium">Hébergé en Europe — Conforme RGPD</span>
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-8 pt-6 border-t border-white/15">
          <p className="text-blue-200 text-sm mb-2 font-medium">Pas encore client ? Contactez-nous :</p>
          <div className="flex flex-wrap gap-4">
            <a href="tel:+212672491389" className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors text-sm font-medium">
              <span>📞</span> +212 672 491 389
            </a>
            <a href="tel:+33751970713" className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors text-sm font-medium">
              <span>📞</span> +33 751 970 713
            </a>
          </div>
          <a href="mailto:contact@mobiliscar.com" className="inline-flex items-center gap-2 mt-3 text-blue-200 hover:text-white transition-colors text-sm">
            <span>✉️</span> contact@mobiliscar.com
          </a>
        </div>
      </div>

    </div>
  )
}
