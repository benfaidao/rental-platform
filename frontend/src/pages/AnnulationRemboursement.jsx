import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const SECTIONS = [
  {
    title: '1. Période d\'essai gratuite',
    content: `MobilisCar offre une période d'essai gratuite de 14 jours à compter de l'activation du compte, sans engagement et sans avoir à renseigner de moyen de paiement. Pendant cette période, l'ensemble des fonctionnalités est accessible. À l'issue des 14 jours, l'abonnement prend effet et le premier paiement est prélevé.`,
  },
  {
    title: '2. Politique d\'annulation',
    content: `Vous pouvez annuler votre abonnement à tout moment depuis votre espace compte ou en contactant notre équipe à contact@mobiliscar.com.\n\n• Abonnement mensuel : l'annulation prend effet à la fin du mois en cours. Vous conservez l'accès jusqu'à la date de fin de période payée.\n• Abonnement annuel : l'annulation prend effet à la fin de la période annuelle en cours. Aucun remboursement au prorata n'est accordé pour les mois restants, sauf disposition contraire (voir article 3).\n\nAucun préavis minimum n'est requis pour l'annulation. L'annulation ne génère pas de pénalité.`,
  },
  {
    title: '3. Remboursements',
    content: `MobilisCar applique la politique de remboursement suivante :\n\n• Période d'essai : aucun paiement n'ayant eu lieu, aucun remboursement n'est applicable.\n• Abonnement mensuel : aucun remboursement partiel pour le mois en cours.\n• Abonnement annuel : en cas de résiliation dans les 30 jours suivant le début d'une nouvelle période annuelle, un remboursement au prorata des mois non utilisés peut être accordé sur demande motivée adressée à contact@mobiliscar.com.\n• Dysfonctionnement majeur : en cas d'interruption de service de plus de 48 heures consécutives imputable à MobilisCar, une compensation sous forme d'extension de service ou de remboursement partiel sera proposée au cas par cas.`,
  },
  {
    title: '4. Cas de résiliation par MobilisCar',
    content: `MobilisCar se réserve le droit de résilier immédiatement un compte sans remboursement en cas de :\n\n• Violation grave des Conditions Générales d'Utilisation.\n• Utilisation frauduleuse ou illégale de la Plateforme.\n• Non-paiement après mise en demeure restée sans réponse sous 7 jours.\n\nEn dehors de ces cas, MobilisCar s'engage à vous informer avec un préavis de 30 jours en cas de cessation du service, et à vous permettre d'exporter vos données.`,
  },
  {
    title: '5. Export et récupération des données',
    content: `Après annulation ou résiliation, vous disposez d'un délai de 30 jours pour demander l'export de l'ensemble de vos données (clients, contrats, véhicules, historique financier) dans un format exploitable (CSV/JSON).\n\nPour demander un export, contactez notre équipe à contact@mobiliscar.com en précisant votre identifiant de compte. L'export est réalisé dans un délai de 5 jours ouvrés.\n\nPassé le délai de 30 jours après résiliation, les données sont définitivement supprimées et ne peuvent plus être récupérées.`,
  },
  {
    title: '6. Modification tarifaire',
    content: `MobilisCar se réserve le droit de modifier ses tarifs. Toute modification tarifaire vous sera communiquée par email au moins 30 jours avant son entrée en vigueur. Si vous n'acceptez pas les nouveaux tarifs, vous pouvez annuler votre abonnement avant la date d'effet sans pénalité.`,
  },
  {
    title: '7. Contact et réclamations',
    content: `Pour toute demande d'annulation, de remboursement ou de réclamation :\n\n• Email : contact@mobiliscar.com\n• Téléphone : +212 672 491 389 ou +33 751 970 713\n• WhatsApp : +33 751 970 713\n\nNous nous engageons à traiter toute réclamation dans un délai de 5 jours ouvrés.`,
  },
]

function Accordion({ sections }) {
  const [open, setOpen] = useState(null)
  return (
    <div className="space-y-2">
      {sections.map((s, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-sm sm:text-base text-gray-800 pr-4">{s.title}</span>
            <span className="text-gray-400 shrink-0 text-lg leading-none">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <div className="px-4 sm:px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3 whitespace-pre-line">
              {s.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AnnulationRemboursement() {
  return (
    <div className="min-h-screen bg-white">

      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/"><Logo size="md" /></Link>
          <div className="flex items-center gap-3">
            <Link to="/demande-acces" className="hidden sm:block text-sm text-blue-600 hover:underline font-medium">Demander l'accès</Link>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">Se connecter →</Link>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-[#0f2a5e] via-[#1a3f8f] to-[#1e56c0] text-white py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block bg-white/15 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
            Légal
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight mb-3">
            Annulation & Remboursement
          </h1>
          <p className="text-blue-200 text-sm">Dernière mise à jour : juin 2026 — MobilisCar</p>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Key points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: '🎁', title: '14 jours gratuits', desc: 'Essai complet sans engagement ni carte bancaire' },
              { icon: '🚪', title: 'Résiliable à tout moment', desc: 'Sans préavis minimum ni pénalité de résiliation' },
              { icon: '📦', title: 'Export de données', desc: '30 jours pour récupérer toutes vos données' },
            ].map(k => (
              <div key={k.title} className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-2">{k.icon}</div>
                <p className="font-semibold text-blue-900 text-sm mb-1">{k.title}</p>
                <p className="text-xs text-blue-700 leading-relaxed">{k.desc}</p>
              </div>
            ))}
          </div>
          <Accordion sections={SECTIONS} />
        </div>
      </section>

      <section className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <p className="text-sm text-gray-500">Besoin d'aide pour annuler ou obtenir un remboursement ?</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href="mailto:contact@mobiliscar.com" className="text-blue-600 hover:underline">✉️ contact@mobiliscar.com</a>
            <a href="https://wa.me/33751970713" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">💬 WhatsApp +33 751 970 713</a>
            <a href="tel:+212672491389" className="text-blue-600 hover:underline">📞 +212 672 491 389</a>
          </div>
          <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-gray-400">
            <Link to="/conditions-utilisation" className="hover:text-gray-600">Conditions d'utilisation</Link>
            <Link to="/politique-confidentialite" className="hover:text-gray-600">Politique de confidentialité</Link>
            <Link to="/demande-acces" className="hover:text-gray-600">Demander l'accès</Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Logo size="sm" dark />
          <p className="text-xs">© {new Date().getFullYear()} MobilisCar — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  )
}
