import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo, { LogoIcon } from '../components/Logo'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || '/api'

const features = [
  { icon: '📋', title: 'Contrats PDF', desc: 'Créez et signez vos contrats en quelques clics. QR code intégré pour vérification instantanée.' },
  { icon: '🚗', title: 'Gestion de flotte', desc: 'Suivi complet : maintenance, assurance, CT, disponibilité en temps réel sur calendrier.' },
  { icon: '📊', title: 'Tableau de bord', desc: 'Alertes automatiques, Gantt de disponibilité, indicateurs clés d\'un seul coup d\'œil.' },
  { icon: '💰', title: 'Finance & Comptabilité', desc: 'Recettes, dépenses, soldes espèces/banque, chèques, cotisations et factures signées.' },
  { icon: '👥', title: 'Gestion clients', desc: 'Fiche client complète, CIN, permis, historique de locations et upload de documents.' },
  { icon: '🤝', title: 'Collaboration', desc: 'Partagez votre flotte, répondez aux demandes inter-agences et développez votre réseau.' },
]

const stats = [
  { value: '100%', label: 'Adapté mobile' },
  { value: 'PDF', label: 'Contrats & Factures' },
  { value: '∞', label: 'Véhicules & Clients' },
  { value: '24/7', label: 'Accès en ligne' },
]

const benefits = [
  '✓ Accès démo gratuit, sans engagement',
  '✓ Prise en main en moins de 30 minutes',
  '✓ Support inclus par téléphone et email',
  '✓ Données sécurisées et sauvegardées',
]

export default function Landing() {
  const { user, loading } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', agency: '', phone: '', email: '', city: '' })
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) return null
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />
  if (user) {
    const firstAgency = user.agencyUsers?.[0]?.agencyId
    if (firstAgency) return <Navigate to={`/agency/${firstAgency}`} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await axios.post(`${API}/public/demo-request`, form)
      setSent(true)
      toast.success('Demande envoyée ! Nous vous contacterons rapidement.')
    } catch {
      toast.error('Une erreur est survenue. Contactez-nous directement par téléphone.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <a href="tel:+212672491389" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
              📞 +212 672 491 389
            </a>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">
              Se connecter →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#0f2a5e] via-[#1a3f8f] to-[#1e56c0] text-white py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block bg-white/15 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Gestion de location de véhicules
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-6">
            Pilotez votre flotte<br />
            <span className="text-blue-300">comme un cockpit.</span>
          </h1>
          <p className="text-blue-100 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            La plateforme tout-en-un pour les agences de location de véhicules. Contrats PDF, gestion de flotte, finances et collaboration inter-agences depuis n'importe quel appareil.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#demo" className="w-full sm:w-fit bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-center">
              Demander une démo gratuite →
            </a>
            <Link to="/login" className="w-full sm:w-fit border border-white/40 text-white font-medium px-8 py-3 rounded-xl hover:bg-white/10 transition-colors text-center">
              J'ai déjà un compte
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {stats.map(s => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-bold text-white">{s.value}</p>
                <p className="text-blue-300 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Une seule plateforme pour gérer l'intégralité de votre activité de location.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo form ── */}
      <section id="demo" className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#0f2a5e] to-[#1e56c0] rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex flex-col lg:flex-row">

              {/* Left — pitch */}
              <div className="lg:w-2/5 p-8 sm:p-10 text-white flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-4 leading-snug">
                    Demandez un accès démo <span className="text-blue-300">gratuit</span>
                  </h2>
                  <p className="text-blue-100 text-sm leading-relaxed mb-8">
                    Nous configurons votre espace en moins de 24 h et vous guidons lors d'une démonstration personnalisée.
                  </p>
                  <ul className="space-y-2">
                    {benefits.map(b => (
                      <li key={b} className="text-sm text-blue-100 flex items-start gap-2">{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8 pt-6 border-t border-white/20 space-y-2">
                  <a href="tel:+212672491389" className="flex items-center gap-2 text-white text-sm hover:text-blue-200 transition-colors">
                    📞 +212 672 491 389
                  </a>
                  <a href="tel:+33751970713" className="flex items-center gap-2 text-white text-sm hover:text-blue-200 transition-colors">
                    📞 +33 751 970 713
                  </a>
                  <a href="mailto:contact@mobiliscar.com" className="flex items-center gap-2 text-blue-200 text-sm hover:text-white transition-colors">
                    ✉️ contact@mobiliscar.com
                  </a>
                </div>
              </div>

              {/* Right — form */}
              <div className="lg:w-3/5 bg-white p-8 sm:p-10">
                {sent ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <div className="text-5xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h3>
                    <p className="text-gray-500 max-w-xs">Nous avons bien reçu votre demande et vous contacterons dans les plus brefs délais.</p>
                    <a href="tel:+212672491389" className="mt-6 btn-primary text-sm">📞 Appeler directement</a>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Vos coordonnées</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Prénom *</label>
                          <input className="input" value={form.firstName} onChange={set('firstName')} required placeholder="Mohammed" />
                        </div>
                        <div>
                          <label className="label">Nom</label>
                          <input className="input" value={form.lastName} onChange={set('lastName')} placeholder="Alaoui" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">Nom de l'agence *</label>
                          <input className="input" value={form.agency} onChange={set('agency')} required placeholder="Auto Location Marrakech" />
                        </div>
                        <div>
                          <label className="label">Téléphone *</label>
                          <input className="input" type="tel" value={form.phone} onChange={set('phone')} required placeholder="06 12 34 56 78" />
                        </div>
                        <div>
                          <label className="label">Email *</label>
                          <input className="input" type="email" value={form.email} onChange={set('email')} required placeholder="contact@agence.ma" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">Ville</label>
                          <input className="input" value={form.city} onChange={set('city')} placeholder="Casablanca, Marrakech, Paris..." />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60 mt-2"
                      >
                        {submitting ? 'Envoi en cours...' : 'Demander ma démo gratuite →'}
                      </button>
                      <p className="text-xs text-gray-400 text-center">Sans engagement — réponse sous 24 h</p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Logo size="sm" dark />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="tel:+212672491389" className="hover:text-white transition-colors">+212 672 491 389</a>
            <a href="tel:+33751970713" className="hover:text-white transition-colors">+33 751 970 713</a>
            <a href="mailto:contact@mobiliscar.com" className="hover:text-white transition-colors">contact@mobiliscar.com</a>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Mobiliscar — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  )
}
