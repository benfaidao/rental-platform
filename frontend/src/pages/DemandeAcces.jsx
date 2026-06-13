import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || '/api'

const included = [
  { icon: '📋', title: 'Contrats PDF', desc: 'Créez, signez et archivez vos contrats de location en quelques clics.' },
  { icon: '🚗', title: 'Gestion de flotte', desc: 'Suivi de chaque véhicule : maintenance, assurance, CT, disponibilité.' },
  { icon: '👥', title: 'Clients & documents', desc: 'Fiche client complète avec CIN, permis, historique et uploads.' },
  { icon: '💰', title: 'Finance complète', desc: 'Recettes, dépenses, chèques, cotisations associés et factures.' },
  { icon: '📊', title: 'Tableau de bord', desc: 'Alertes automatiques, Gantt de disponibilité, indicateurs clés.' },
  { icon: '🤝', title: 'Réseau inter-agences', desc: 'Partagez votre flotte et répondez aux demandes de location.' },
]

const trust = [
  { icon: '🔒', text: 'Données hébergées en Europe' },
  { icon: '✅', text: 'Conforme RGPD' },
  { icon: '📞', text: 'Support inclus' },
  { icon: '🚀', text: 'Mise en place en 24 h' },
]

const CGU_SECTIONS = [
  {
    title: 'Article 1 — Objet et champ d\'application',
    content: `Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la plateforme MobilisCar (ci-après « la Plateforme »), éditée par MobilisCar. En soumettant une demande d'accès, l'utilisateur (ci-après « l'Agence ») accepte sans réserve les présentes CGU. Ces CGU s'appliquent à toute personne physique ou morale exploitant une agence de location de véhicules et souhaitant utiliser la Plateforme à des fins professionnelles.`,
  },
  {
    title: 'Article 2 — Accès et inscription',
    content: `L'accès à la Plateforme est soumis à une demande préalable examinée par MobilisCar. L'Agence s'engage à fournir des informations exactes, complètes et à jour lors de son inscription. Tout accès est nominatif et personnel. L'Agence est seule responsable de la confidentialité de ses identifiants de connexion et s'engage à signaler immédiatement toute utilisation non autorisée de son compte.`,
  },
  {
    title: 'Article 3 — Description du service',
    content: `MobilisCar est une application SaaS (Software as a Service) de gestion pour agences de location de véhicules. Elle inclut notamment : la gestion des contrats de location avec génération de PDF, la gestion de flotte et suivi de maintenance, le suivi des clients et de leurs documents, la gestion financière (recettes, dépenses, chèques), un tableau de bord avec alertes automatiques, ainsi qu'un module de collaboration inter-agences. MobilisCar se réserve le droit de faire évoluer les fonctionnalités de la Plateforme à tout moment.`,
  },
  {
    title: 'Article 4 — Obligations de l\'Agence',
    content: `L'Agence s'engage à utiliser la Plateforme conformément à la législation en vigueur et aux présentes CGU. Elle s'interdit notamment : d'utiliser la Plateforme à des fins illicites ; de tenter d'accéder sans autorisation aux données d'autres utilisateurs ; de perturber le bon fonctionnement de la Plateforme ; de reproduire, copier ou revendre tout ou partie de la Plateforme sans autorisation écrite de MobilisCar. L'Agence est responsable de l'ensemble des données saisies sur la Plateforme et garantit disposer des droits nécessaires pour les traiter.`,
  },
  {
    title: 'Article 5 — Données personnelles et RGPD',
    content: `MobilisCar traite les données personnelles des utilisateurs et de leurs clients conformément au Règlement Général sur la Protection des Données (RGPD – UE 2016/679) et à la loi applicable. Les données sont hébergées en Europe. L'Agence agit en tant que responsable de traitement pour les données de ses clients. MobilisCar agit en tant que sous-traitant et s'engage à traiter ces données uniquement selon les instructions de l'Agence. L'Agence dispose d'un droit d'accès, de rectification, d'effacement et de portabilité de ses données en contactant contact@mobiliscar.com. Les données sont conservées pendant la durée du contrat et supprimées dans un délai de 90 jours après résiliation, sauf obligation légale contraire.`,
  },
  {
    title: 'Article 6 — Tarification et facturation',
    content: `L'accès à la Plateforme est soumis à un abonnement dont le tarif est communiqué lors de l'activation du compte. Les modalités tarifaires (montant, périodicité, moyens de paiement) font l'objet d'un accord commercial séparé entre MobilisCar et l'Agence. MobilisCar se réserve le droit de modifier ses tarifs avec un préavis de 30 jours. En cas de non-paiement, MobilisCar peut suspendre ou résilier l'accès à la Plateforme.`,
  },
  {
    title: 'Article 7 — Responsabilité et disponibilité',
    content: `MobilisCar s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la disponibilité et la sécurité de la Plateforme. Toutefois, MobilisCar ne saurait être tenu responsable d'interruptions temporaires dues à des opérations de maintenance, à des cas de force majeure ou à des défaillances techniques indépendantes de sa volonté. La responsabilité de MobilisCar est limitée au montant des abonnements versés au cours des 12 derniers mois. En aucun cas MobilisCar ne peut être tenu responsable de pertes de données, de manque à gagner ou de préjudice indirect.`,
  },
  {
    title: 'Article 8 — Propriété intellectuelle',
    content: `La Plateforme MobilisCar, incluant son code source, son design, ses logos et ses contenus, est protégée par le droit de la propriété intellectuelle. Toute reproduction, représentation, modification ou exploitation non autorisée est strictement interdite. L'Agence conserve la propriété de ses données et documents téléversés sur la Plateforme.`,
  },
  {
    title: 'Article 9 — Résiliation',
    content: `Chacune des parties peut résilier le contrat à tout moment avec un préavis de 30 jours adressé par email. En cas de violation grave des présentes CGU, MobilisCar peut résilier immédiatement l'accès sans préavis ni indemnité. Après résiliation, l'Agence peut demander l'export de ses données dans un délai de 30 jours. Passé ce délai, les données seront supprimées définitivement.`,
  },
  {
    title: 'Article 10 — Droit applicable et juridiction',
    content: `Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut d'accord amiable dans un délai de 30 jours, tout litige relatif à l'interprétation ou à l'exécution des présentes CGU sera soumis à la compétence exclusive des tribunaux compétents. La version française des présentes CGU fait foi en cas de contradiction avec toute traduction.`,
  },
]

function CguAccordion() {
  const [open, setOpen] = useState(null)
  return (
    <div className="space-y-2">
      {CGU_SECTIONS.map((s, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-sm text-gray-800">{s.title}</span>
            <span className="text-gray-400 shrink-0 ml-2 text-lg leading-none">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
              {s.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function DemandeAcces() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    agency: '', city: '', vehicles: '', message: '',
  })
  const [acceptCgu, setAcceptCgu] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCgu, setShowCgu] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!acceptCgu || !acceptPrivacy) {
      toast.error('Veuillez accepter les conditions d\'utilisation et la politique de confidentialité.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post(`${API}/public/demo-request`, {
        ...form,
        source: 'demande-acces',
        acceptedCgu: true,
      })
      setSent(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast.error('Une erreur est survenue. Contactez-nous directement.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-3">
            <a href="tel:+212672491389" className="hidden sm:block text-sm text-gray-600 hover:text-gray-900">
              📞 +212 672 491 389
            </a>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">
              Se connecter →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero compact */}
      <section className="bg-gradient-to-br from-[#0f2a5e] via-[#1a3f8f] to-[#1e56c0] text-white py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block bg-white/15 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
            Accès professionnel
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight mb-3">
            Demandez votre accès à MobilisCar
          </h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto">
            Remplissez le formulaire ci-dessous. Notre équipe vous contacte sous 24 h pour configurer votre espace.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {trust.map(t => (
              <span key={t.text} className="flex items-center gap-1.5 text-xs text-blue-200">
                <span>{t.icon}</span> {t.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Main — form + pitch */}
      <section className="py-10 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {sent ? (
            <div className="max-w-lg mx-auto text-center py-16">
              <div className="text-6xl mb-5">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Demande envoyée !</h2>
              <p className="text-gray-500 mb-6">Nous avons bien reçu votre demande d'accès. Notre équipe vous contactera dans les 24 heures pour finaliser la mise en place de votre espace.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <a href="tel:+212672491389" className="btn-primary text-sm py-2.5 justify-center">📞 Appeler directement</a>
                <Link to="/" className="py-2.5 px-4 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 text-center">Retour à l'accueil</Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 xl:gap-12">

              {/* Left pitch */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Ce qui est inclus</h2>
                  <p className="text-gray-500 text-sm">Un accès complet à toutes les fonctionnalités dès le premier jour.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {included.map(f => (
                    <div key={f.title} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-xl shrink-0">{f.icon}</span>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{f.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Security block */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
                  <p className="font-semibold text-blue-900 text-sm flex items-center gap-2">🛡️ Vos données en sécurité</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Données hébergées en Europe, sauvegardes automatiques quotidiennes, accès chiffré HTTPS. Conformité RGPD garantie.
                  </p>
                  <p className="text-xs text-blue-500 font-medium">Vos données vous appartiennent — jamais partagées.</p>
                </div>

                {/* Contact */}
                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Besoin d'aide ?</p>
                  <a href="tel:+212672491389" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">📞 +212 672 491 389</a>
                  <a href="tel:+33751970713" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">📞 +33 751 970 713</a>
                  <a href="mailto:contact@mobiliscar.com" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">✉️ contact@mobiliscar.com</a>
                </div>
              </div>

              {/* Right form */}
              <div className="lg:col-span-3">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Vos informations</h2>
                  <p className="text-sm text-gray-500 mb-6">Tous les champs marqués * sont obligatoires.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Prénom *</label>
                        <input className="input" value={form.firstName} onChange={set('firstName')} required placeholder="Mohammed" />
                      </div>
                      <div>
                        <label className="label">Nom *</label>
                        <input className="input" value={form.lastName} onChange={set('lastName')} required placeholder="Alaoui" />
                      </div>
                      <div>
                        <label className="label">Email professionnel *</label>
                        <input className="input" type="email" value={form.email} onChange={set('email')} required placeholder="contact@agence.ma" />
                      </div>
                      <div>
                        <label className="label">Téléphone *</label>
                        <input className="input" type="tel" value={form.phone} onChange={set('phone')} required placeholder="+212 6 12 34 56 78" />
                      </div>
                      <div className="col-span-2">
                        <label className="label">Nom de l'agence *</label>
                        <input className="input" value={form.agency} onChange={set('agency')} required placeholder="Auto Location Marrakech" />
                      </div>
                      <div>
                        <label className="label">Ville *</label>
                        <input className="input" value={form.city} onChange={set('city')} required placeholder="Casablanca" />
                      </div>
                      <div>
                        <label className="label">Nombre de véhicules</label>
                        <select className="input" value={form.vehicles} onChange={set('vehicles')}>
                          <option value="">Choisir...</option>
                          <option value="1-5">1 à 5 véhicules</option>
                          <option value="6-15">6 à 15 véhicules</option>
                          <option value="16-30">16 à 30 véhicules</option>
                          <option value="31+">Plus de 30 véhicules</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="label">Message (optionnel)</label>
                        <textarea
                          className="input resize-none"
                          rows={3}
                          value={form.message}
                          onChange={set('message')}
                          placeholder="Décrivez vos besoins spécifiques, questions particulières..."
                        />
                      </div>
                    </div>

                    {/* Checkboxes CGU */}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="mt-0.5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={acceptCgu}
                          onChange={e => setAcceptCgu(e.target.checked)}
                          required
                        />
                        <span className="text-sm text-gray-600 leading-snug">
                          J'ai lu et j'accepte les{' '}
                          <button
                            type="button"
                            onClick={() => setShowCgu(v => !v)}
                            className="text-blue-600 underline hover:text-blue-800 font-medium"
                          >
                            Conditions Générales d'Utilisation
                          </button>{' '}*
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="mt-0.5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={acceptPrivacy}
                          onChange={e => setAcceptPrivacy(e.target.checked)}
                          required
                        />
                        <span className="text-sm text-gray-600 leading-snug">
                          J'accepte la{' '}
                          <button
                            type="button"
                            onClick={() => setShowCgu(v => !v)}
                            className="text-blue-600 underline hover:text-blue-800 font-medium"
                          >
                            Politique de confidentialité
                          </button>{' '}
                          et le traitement de mes données personnelles *
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !acceptCgu || !acceptPrivacy}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                    >
                      {submitting ? 'Envoi en cours...' : 'Envoyer ma demande d\'accès →'}
                    </button>
                    <p className="text-xs text-gray-400 text-center">
                      Sans engagement — réponse sous 24 h — données sécurisées
                    </p>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CGU section */}
      <section className="bg-gray-50 border-t border-gray-200 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Conditions Générales d'Utilisation</h2>
              <p className="text-sm text-gray-500 mt-1">Dernière mise à jour : juin 2026 — MobilisCar</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCgu(v => !v)}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              {showCgu ? 'Réduire ↑' : 'Lire les CGU ↓'}
            </button>
          </div>
          {showCgu && <CguAccordion />}
          {!showCgu && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-600 leading-relaxed">
              <p>
                En demandant un accès à MobilisCar, vous acceptez nos Conditions Générales d'Utilisation.
                Ces CGU régissent votre utilisation de la plateforme et garantissent la protection de vos données
                conformément au RGPD. Vos données sont hébergées en Europe et ne seront jamais partagées avec des tiers.
              </p>
              <button
                type="button"
                onClick={() => setShowCgu(true)}
                className="mt-3 text-blue-600 hover:underline font-medium"
              >
                Lire les conditions complètes →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Logo size="sm" dark />
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
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
