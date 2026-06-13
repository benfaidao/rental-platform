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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/demande-acces" className="hidden sm:block text-sm text-blue-600 hover:underline font-medium">
              Demander l'accès
            </Link>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">
              Se connecter →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#0f2a5e] via-[#1a3f8f] to-[#1e56c0] text-white py-10 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block bg-white/15 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full mb-5 tracking-wide uppercase">
            Gestion de location de véhicules
          </span>
          <h1 className="text-2xl sm:text-5xl font-bold leading-tight mb-4 sm:mb-6">
            Pilotez votre flotte<br />
            <span className="text-blue-300">comme un cockpit.</span>
          </h1>
          <p className="text-blue-100 text-sm sm:text-xl max-w-2xl mx-auto mb-7 sm:mb-10 leading-relaxed">
            La plateforme tout-en-un pour les agences de location de véhicules. Contrats PDF, gestion de flotte, finances et collaboration inter-agences.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/demande-acces" className="w-full sm:w-fit bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-center text-sm sm:text-base">
              Demander l'accès gratuitement →
            </Link>
            <Link to="/login" className="w-full sm:w-fit border border-white/40 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-center text-sm sm:text-base">
              J'ai déjà un compte
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-10 sm:mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-2xl mx-auto">
            {stats.map(s => (
              <div key={s.label}>
                <p className="text-xl sm:text-3xl font-bold text-white">{s.value}</p>
                <p className="text-blue-300 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 mt-2 sm:mt-3 text-sm sm:text-base max-w-xl mx-auto">Une seule plateforme pour gérer l'intégralité de votre activité de location.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="text-2xl sm:text-3xl mb-2 sm:mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">{f.title}</h3>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo form ── */}
      <section id="demo" className="py-12 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#0f2a5e] to-[#1e56c0] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
            {/* Mobile : form d'abord, pitch dessous — Desktop : pitch gauche, form droite */}
            <div className="flex flex-col-reverse lg:flex-row">

              {/* Pitch (affiché en bas sur mobile) */}
              <div className="lg:w-2/5 p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-snug">
                    Demandez un accès démo <span className="text-blue-300">gratuit</span>
                  </h2>
                  <p className="text-blue-100 text-sm leading-relaxed mb-5 hidden sm:block">
                    Nous configurons votre espace en moins de 24 h et vous guidons lors d'une démonstration personnalisée.
                  </p>
                  <ul className="space-y-1.5">
                    {benefits.map(b => (
                      <li key={b} className="text-sm text-blue-100">{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 pt-5 border-t border-white/20 flex flex-wrap gap-x-5 gap-y-1.5">
                  <a href="tel:+212672491389" className="text-white text-sm hover:text-blue-200 transition-colors">
                    📞 +212 672 491 389
                  </a>
                  <a href="tel:+33751970713" className="text-white text-sm hover:text-blue-200 transition-colors">
                    📞 +33 751 970 713
                  </a>
                  <a href="mailto:contact@mobiliscar.com" className="text-blue-200 text-sm hover:text-white transition-colors">
                    ✉️ contact@mobiliscar.com
                  </a>
                </div>
              </div>

              {/* Formulaire (affiché en haut sur mobile) */}
              <div className="lg:w-3/5 bg-white p-6 sm:p-8 lg:p-10">
                {sent ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="text-5xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h3>
                    <p className="text-gray-500 max-w-xs text-sm">Nous avons bien reçu votre demande et vous contacterons dans les plus brefs délais.</p>
                    <a href="tel:+212672491389" className="mt-6 btn-primary text-sm">📞 Appeler directement</a>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Vos coordonnées</h3>
                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="label">Prénom *</label>
                          <input className="input" value={form.firstName} onChange={set('firstName')} required placeholder="Mohammed" />
                        </div>
                        <div>
                          <label className="label">Nom</label>
                          <input className="input" value={form.lastName} onChange={set('lastName')} placeholder="Alaoui" />
                        </div>
                        <div className="col-span-2">
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
                        <div className="col-span-2">
                          <label className="label">Ville</label>
                          <input className="input" value={form.city} onChange={set('city')} placeholder="Casablanca, Marrakech, Paris..." />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
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
          <p className="text-xs">© {new Date().getFullYear()} MobilisCar — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  )
}
