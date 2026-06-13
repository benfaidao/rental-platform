import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const SECTIONS = [
  {
    title: '1. Qui sommes-nous ?',
    content: `MobilisCar est une plateforme SaaS dédiée à la gestion des agences de location de véhicules. En tant que responsable de traitement, MobilisCar s'engage à protéger la vie privée de ses utilisateurs et à traiter leurs données personnelles dans le strict respect du Règlement Général sur la Protection des Données (RGPD – UE 2016/679) et de la législation applicable.\n\nContact : contact@mobiliscar.com — +212 672 491 389`,
  },
  {
    title: '2. Données collectées',
    content: `Nous collectons les données suivantes :\n\n• Données d'identification : nom, prénom, adresse email professionnelle, numéro de téléphone.\n• Données professionnelles : nom de l'agence, ville, nombre de véhicules gérés.\n• Données de navigation : adresse IP, type de navigateur, pages consultées (via journaux serveurs anonymisés).\n• Données métier saisies par l'Agence : informations relatives aux clients, véhicules, contrats et opérations financières — ces données appartiennent à l'Agence.`,
  },
  {
    title: '3. Finalités du traitement',
    content: `Vos données sont traitées pour les finalités suivantes :\n\n• Traitement de votre demande d'accès et activation de votre compte.\n• Fourniture et amélioration de la plateforme MobilisCar.\n• Communication relative à votre abonnement (factures, notifications, mises à jour importantes).\n• Support technique et assistance.\n• Respect des obligations légales et réglementaires.\n\nNous n'utilisons vos données à aucune fin de prospection commerciale non consentie.`,
  },
  {
    title: '4. Base légale du traitement',
    content: `Le traitement de vos données repose sur les bases légales suivantes :\n\n• Exécution du contrat : pour fournir les services auxquels vous avez souscrit.\n• Intérêt légitime : amélioration de la plateforme et prévention de la fraude.\n• Obligation légale : conservation des données comptables et fiscales.\n• Consentement : pour les communications marketing optionnelles.`,
  },
  {
    title: '5. Hébergement et sécurité des données',
    content: `Toutes les données sont hébergées en Europe, sur des serveurs conformes aux normes ISO 27001. Nous mettons en œuvre les mesures techniques et organisationnelles suivantes :\n\n• Chiffrement des données en transit (HTTPS/TLS) et au repos.\n• Sauvegardes automatiques quotidiennes avec rétention 30 jours.\n• Accès restreint aux données par rôles et permissions strictes.\n• Journaux d'accès et surveillance des anomalies.\n• Authentification à deux facteurs disponible pour les administrateurs.\n\nEn cas de violation de données, vous serez notifié dans les 72 heures conformément au RGPD.`,
  },
  {
    title: '6. Partage des données',
    content: `Nous ne vendons ni ne louons vos données personnelles à des tiers. Vos données peuvent être partagées uniquement dans les cas suivants :\n\n• Prestataires techniques (hébergement, envoi d'emails transactionnels) soumis à des contrats de traitement conformes au RGPD.\n• Obligations légales : si requis par une autorité judiciaire ou administrative compétente.\n\nEn dehors de ces cas, aucune donnée n'est transmise à des tiers sans votre consentement explicite.`,
  },
  {
    title: '7. Conservation des données',
    content: `Vos données sont conservées pendant la durée de votre abonnement et supprimées dans un délai de 90 jours après la résiliation de votre compte, sauf obligation légale contraire (par exemple, données comptables conservées 10 ans selon la législation fiscale).\n\nLes données issues de demandes d'accès non activées sont supprimées après 12 mois.`,
  },
  {
    title: '8. Vos droits',
    content: `Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :\n\n• Droit d'accès : obtenir une copie de vos données.\n• Droit de rectification : corriger des données inexactes.\n• Droit à l'effacement : demander la suppression de vos données.\n• Droit à la portabilité : recevoir vos données dans un format structuré.\n• Droit d'opposition : vous opposer à un traitement basé sur l'intérêt légitime.\n• Droit à la limitation : demander la suspension temporaire du traitement.\n\nPour exercer ces droits, contactez-nous à contact@mobiliscar.com. Nous nous engageons à répondre dans un délai de 30 jours.`,
  },
  {
    title: '9. Cookies',
    content: `MobilisCar utilise uniquement des cookies techniques strictement nécessaires au fonctionnement de la plateforme (authentification, préférences de session). Aucun cookie publicitaire ou de traçage tiers n'est utilisé. Ces cookies ne requièrent pas votre consentement au sens de la directive ePrivacy.`,
  },
  {
    title: '10. Modifications de la politique',
    content: `MobilisCar se réserve le droit de modifier la présente Politique de Confidentialité. En cas de modification substantielle, vous serez notifié par email au moins 15 jours avant l'entrée en vigueur des nouvelles dispositions. La date de dernière mise à jour est indiquée en haut de cette page.`,
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

export default function PolitiqueConfidentialite() {
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
            Politique de Confidentialité
          </h1>
          <p className="text-blue-200 text-sm">Dernière mise à jour : juin 2026 — MobilisCar</p>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-5 mb-8 text-sm text-blue-800 leading-relaxed flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">🛡️</span>
            <p>MobilisCar s'engage à protéger vos données personnelles. Toutes les données sont hébergées en Europe et traitées conformément au RGPD. Vos données ne sont jamais vendues ni partagées avec des tiers à des fins commerciales.</p>
          </div>
          <Accordion sections={SECTIONS} />
        </div>
      </section>

      <section className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <p className="text-sm text-gray-500">Questions sur le traitement de vos données ?</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href="mailto:contact@mobiliscar.com" className="text-blue-600 hover:underline">✉️ contact@mobiliscar.com</a>
            <a href="tel:+212672491389" className="text-blue-600 hover:underline">📞 +212 672 491 389</a>
          </div>
          <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-gray-400">
            <Link to="/conditions-utilisation" className="hover:text-gray-600">Conditions d'utilisation</Link>
            <Link to="/annulation-remboursement" className="hover:text-gray-600">Annulation & Remboursement</Link>
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
