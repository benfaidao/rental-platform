import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-gray-900 text-sm font-medium text-right">{value}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}

const STATUS_LABELS = {
  PENDING: 'En attente',
  ACTIVE: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
}

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default function ContractView() {
  const { contractNumber } = useParams()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get(`${API_URL}/public/contracts/${contractNumber}`)
      .then(r => setContract(r.data))
      .catch(e => setError(e.response?.status === 404 ? 'Contrat introuvable.' : 'Erreur lors du chargement.'))
      .finally(() => setLoading(false))
  }, [contractNumber])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-500 text-lg">{error}</p>
      </div>
    </div>
  )

  const c = contract
  const clientName = c.client
    ? `${c.client.firstName} ${c.client.lastName}`
    : c.clientName

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Contrat de location</p>
            <h1 className="text-2xl font-bold text-gray-900">{c.contractNumber}</h1>
          </div>
          {c.status && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700'}`}>
              {STATUS_LABELS[c.status] || c.status}
            </span>
          )}
        </div>
        {c.agency && (
          <div className="max-w-2xl mx-auto px-4 pb-4">
            <p className="text-sm font-medium text-gray-700">{c.agency.name}</p>
            {c.agency.address && <p className="text-xs text-gray-400">{c.agency.address}</p>}
            {c.agency.phone && <p className="text-xs text-gray-400">{c.agency.phone}</p>}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Véhicule */}
        {c.car && (
          <Section title="Véhicule">
            <Row label="Marque / Modèle" value={`${c.car.brand} ${c.car.model}`} />
            <Row label="Immatriculation" value={c.car.finalPlate || c.car.wwPlate} />
          </Section>
        )}

        {/* Client */}
        <Section title="Locataire">
          <Row label="Nom" value={clientName} />
          {c.client?.phone && <Row label="Téléphone" value={c.client.phone} />}
          {c.client?.email && <Row label="Email" value={c.client.email} />}
          {c.clientIdNumber && <Row label="CIN / Passeport" value={c.clientIdNumber} />}
          {c.clientIdExpiry && <Row label="Expiration CIN / Passeport" value={fmt(c.clientIdExpiry)} />}
          {c.clientLicenseNumber && <Row label="Permis de conduire" value={c.clientLicenseNumber} />}
          {c.clientLicenseExpiry && <Row label="Expiration permis" value={fmt(c.clientLicenseExpiry)} />}
        </Section>

        {/* Période */}
        <Section title="Période de location">
          <Row label="Départ" value={`${fmt(c.startDate)}${c.startTime ? ' à ' + c.startTime : ''}`} />
          <Row label="Retour prévu" value={`${fmt(c.endDate)}${c.endTime ? ' à ' + c.endTime : ''}`} />
          {c.actualReturnDate && <Row label="Retour effectif" value={fmt(c.actualReturnDate)} />}
          {c.pickupLocation && <Row label="Lieu de prise en charge" value={c.pickupLocation} />}
          {c.returnLocation && <Row label="Lieu de retour" value={c.returnLocation} />}
          {c.startMileage != null && <Row label="Kilométrage départ" value={`${c.startMileage.toLocaleString()} km`} />}
          {c.endMileage != null && <Row label="Kilométrage retour" value={`${c.endMileage.toLocaleString()} km`} />}
          {c.allowedMileage != null && <Row label="Kilométrage autorisé" value={`${c.allowedMileage.toLocaleString()} km`} />}
        </Section>

        {/* Financier */}
        <Section title="Informations financières">
          <Row label="Montant" value={c.rentalAmount != null ? `${c.rentalAmount.toLocaleString()} ${c.currency || ''}` : null} />
          {c.montantTTC != null && <Row label="Montant TTC" value={`${c.montantTTC.toLocaleString()} ${c.currency || ''}`} />}
          {c.amountPaid != null && <Row label="Encaissé" value={`${c.amountPaid.toLocaleString()} ${c.currency || ''}`} />}
          {c.guaranteeAmount > 0 && <Row label="Garantie encaissée" value={`${c.guaranteeAmount.toLocaleString()} ${c.currency || ''}`} />}
          {c.guaranteeCheck && c.guaranteeCheckAmount > 0 && (
            <Row
              label="Caution (chèque)"
              value={`${c.guaranteeCheckAmount.toLocaleString()} ${c.currency || ''}${c.guaranteeCheckNumber ? ` — N° ${c.guaranteeCheckNumber}` : ''}`}
            />
          )}
          <Row label="Dépassement kilométrique" value={c.allowOverage ? 'Autorisé' : 'Non autorisé'} />
        </Section>

        {/* Paiements périodiques */}
        {c.periodicPayments?.length > 0 && (
          <Section title="Échéancier de paiement">
            {c.periodicPayments.map((p, i) => (
              <div key={p.id} className="flex justify-between gap-4 py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-500 text-sm">
                  {fmt(p.periodStart)} – {fmt(p.periodEnd)}
                </span>
                <span className={`text-sm font-medium ${p.paid ? 'text-green-600' : 'text-gray-900'}`}>
                  {p.amount.toLocaleString()} {c.currency} {p.paid ? '✓' : ''}
                </span>
              </div>
            ))}
          </Section>
        )}

        {/* Notes */}
        {c.notes && (
          <Section title="Notes">
            <p className="text-sm text-gray-700 py-2 whitespace-pre-wrap">{c.notes}</p>
          </Section>
        )}

        <p className="text-center text-xs text-gray-400 pt-2 pb-6">mobiliscar.com</p>
      </div>
    </div>
  )
}
