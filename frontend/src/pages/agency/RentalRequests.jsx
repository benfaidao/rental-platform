import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRequestSettings, updateRequestSettings,
  getMyRequests, createRentalRequest, cancelRentalRequest, updateRentalRequest,
  getIncomingRequests, makeOffer, respondToOffer, getCars,
} from '../../api'
import Modal from '../../components/Modal'
import { Plus, Send, Check, X, Trash2, Clock, Car, Building2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd MMM yyyy', { locale: fr }) : '-'
const days = (s, e) => Math.max(1, differenceInDays(new Date(e), new Date(s)) + 1)

const STATUS = {
  OPEN: { label: 'Ouverte', cls: 'bg-blue-100 text-blue-700' },
  FULFILLED: { label: 'Acceptée', cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Annulée', cls: 'bg-red-100 text-red-600' },
}
const OFFER_STATUS = {
  PENDING: { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED: { label: 'Acceptée', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Refusée', cls: 'bg-red-100 text-red-600' },
}

// ─── Form to create a rental request ─────────────────────────────────────────
function RequestForm({ onClose, agencyId }) {
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({ clientName: '', phone: '', startDate: today, endDate: '', carType: '', budget: '', notes: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const d = form.startDate && form.endDate ? days(form.startDate, form.endDate) : 0

  const mutation = useMutation({
    mutationFn: (data) => createRentalRequest(agencyId, data),
    onSuccess: () => { qc.invalidateQueries(['myRequests', agencyId]); onClose(); toast.success('Demande publiée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nom du client *</label>
          <input className="input" value={form.clientName} onChange={set('clientName')} required placeholder="Ex. Mohammed Alaoui" />
        </div>
        <div>
          <label className="label">Téléphone du client</label>
          <input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="Ex. 06 12 34 56 78" />
        </div>
        <div>
          <label className="label">Date début *</label>
          <input className="input" type="date" value={form.startDate} onChange={set('startDate')} required />
        </div>
        <div>
          <label className="label">Date fin *</label>
          <input className="input" type="date" value={form.endDate} min={form.startDate} onChange={set('endDate')} required />
        </div>
        {d > 0 && <p className="md:col-span-2 text-xs text-gray-500 -mt-2">{d} jour(s)</p>}
        <div>
          <label className="label">Type de véhicule souhaité</label>
          <input className="input" value={form.carType} onChange={set('carType')} placeholder="Ex. SUV, berline, utilitaire..." />
        </div>
        <div>
          <label className="label">Budget max (MAD)</label>
          <input className="input" type="number" min="0" value={form.budget} onChange={set('budget')} placeholder="Optionnel" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} placeholder="Exigences particulières, kilométrage, équipements..." />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary justify-center w-full sm:w-fit">Annuler</button>
        <button type="submit" className="btn-primary justify-center w-full sm:w-fit" disabled={mutation.isPending}>
          <Send className="w-4 h-4 inline mr-1" /> Publier la demande
        </button>
      </div>
    </form>
  )
}

// ─── Form to make an offer ────────────────────────────────────────────────────
function OfferForm({ agencyId, request, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ carId: '', price: '', phone: '', notes: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const d = days(request.startDate, request.endDate)

  const { data: cars = [] } = useQuery({
    queryKey: ['cars', agencyId],
    queryFn: () => getCars(agencyId).then(r => r.data),
  })
  const availCars = cars.filter(c => c.status === 'AVAILABLE' || c.status === 'RENTED')

  const mutation = useMutation({
    mutationFn: (data) => makeOffer(agencyId, request.id, data),
    onSuccess: () => { qc.invalidateQueries(['incomingRequests', agencyId]); onClose(); toast.success('Offre envoyée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
        <p className="font-semibold">{request.clientName} — {request.agency?.name}</p>
        <p className="text-gray-600">{fmtDate(request.startDate)} → {fmtDate(request.endDate)} ({d} jour{d > 1 ? 's' : ''})</p>
        {request.carType && <p className="text-gray-500">Type demandé : {request.carType}</p>}
        {request.budget && <p className="text-gray-500">Budget max : {request.budget.toLocaleString()} MAD</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Véhicule proposé</label>
          <select className="input" value={form.carId} onChange={set('carId')}>
            <option value="">— Choisir un véhicule —</option>
            {availCars.map(c => (
              <option key={c.id} value={c.id}>{c.brand} {c.model} {c.finalPlate ? `(${c.finalPlate})` : c.wwPlate ? `(${c.wwPlate})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Prix proposé (MAD) *</label>
          <input className="input" type="number" min="0" value={form.price} onChange={set('price')} required />
          {form.price && d > 0 && (
            <p className="text-xs text-gray-400 mt-1">{(form.price / d).toFixed(0)} MAD/jour</p>
          )}
        </div>
        <div>
          <label className="label">Téléphone de contact</label>
          <input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="Ex. 06 12 34 56 78" />
        </div>
        <div className="col-span-2">
          <label className="label">Note pour le demandeur</label>
          <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} placeholder="Conditions, disponibilité..." />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-fit justify-center">Annuler</button>
        <button type="submit" className="btn-primary w-full sm:w-fit justify-center" disabled={mutation.isPending}>
          <Send className="w-4 h-4 inline mr-1" /> Envoyer l'offre
        </button>
      </div>
    </form>
  )
}

// ─── My request card (with offers list) ──────────────────────────────────────
function MyRequestCard({ agencyId, request }) {
  const qc = useQueryClient()
  const [showOffers, setShowOffers] = useState(request.offers?.length > 0)

  const cancelMutation = useMutation({
    mutationFn: () => cancelRentalRequest(agencyId, request.id),
    onSuccess: () => { qc.invalidateQueries(['myRequests', agencyId]); toast.success('Demande annulée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const respondMutation = useMutation({
    mutationFn: ({ offerId, status }) => respondToOffer(agencyId, request.id, offerId, { status }),
    onSuccess: () => { qc.invalidateQueries(['myRequests', agencyId]); toast.success('Réponse envoyée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const d = days(request.startDate, request.endDate)
  const isOpen = request.status === 'OPEN'

  return (
    <div className={`card p-4 border-l-4 ${isOpen ? 'border-l-blue-400' : request.status === 'FULFILLED' ? 'border-l-green-400' : 'border-l-red-300'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">{request.clientName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS[request.status]?.cls}`}>
              {STATUS[request.status]?.label}
            </span>
            {request.offers?.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                {request.offers.length} offre{request.offers.length > 1 ? 's' : ''} reçue{request.offers.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtDate(request.startDate)} → {fmtDate(request.endDate)} ({d}j)</span>
            {request.carType && <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />{request.carType}</span>}
            {request.budget && <span>{request.budget.toLocaleString()} MAD max</span>}
            {request.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{request.phone}</span>}
          </div>
          {request.notes && <p className="text-xs text-gray-400">{request.notes}</p>}
          <p className="text-xs text-gray-400">Publié le {fmtDate(request.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {request.offers?.length > 0 && (
            <button onClick={() => setShowOffers(v => !v)} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
              {showOffers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Offres
            </button>
          )}
          {isOpen && (
            <button onClick={() => { if (confirm('Annuler cette demande ?')) cancelMutation.mutate() }}
              className="p-1.5 hover:bg-red-50 rounded text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showOffers && request.offers?.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Offres reçues</p>
          {request.offers.map(offer => (
            <div key={offer.id} className={`rounded-lg border px-3 py-3 flex items-start justify-between gap-3
              ${offer.status === 'ACCEPTED' ? 'bg-green-50 border-green-200'
              : offer.status === 'REJECTED' ? 'bg-gray-50 border-gray-100 opacity-60'
              : 'bg-white border-gray-200'}`}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{offer.agency?.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${OFFER_STATUS[offer.status]?.cls}`}>
                    {OFFER_STATUS[offer.status]?.label}
                  </span>
                </div>
                <p className="font-semibold text-blue-700">{offer.price.toLocaleString()} MAD <span className="font-normal text-gray-400 text-xs">({(offer.price / d).toFixed(0)} MAD/j)</span></p>
                {offer.car && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Car className="w-3 h-3" /> {offer.car.brand} {offer.car.model} {offer.car.finalPlate || offer.car.wwPlate || ''}
                  </p>
                )}
                {offer.phone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {offer.phone}
                  </p>
                )}
                {offer.notes && <p className="text-xs text-gray-400">{offer.notes}</p>}
              </div>
              {isOpen && offer.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => respondMutation.mutate({ offerId: offer.id, status: 'ACCEPTED' })}
                    className="p-1.5 bg-green-100 hover:bg-green-200 rounded text-green-700" title="Accepter">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => respondMutation.mutate({ offerId: offer.id, status: 'REJECTED' })}
                    className="p-1.5 bg-red-50 hover:bg-red-100 rounded text-red-500" title="Refuser">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Incoming request card (from other agencies) ──────────────────────────────
function IncomingRequestCard({ agencyId, request }) {
  const [showOffer, setShowOffer] = useState(false)
  const d = days(request.startDate, request.endDate)

  const myOffer = request.offers?.find(o => o.agencyId === agencyId)

  return (
    <div className="card p-4 border-l-4 border-l-purple-400">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-purple-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> {request.agency?.name}
            </span>
            <span className="font-semibold">{request.clientName}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtDate(request.startDate)} → {fmtDate(request.endDate)} ({d}j)</span>
            {request.carType && <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />{request.carType}</span>}
            {request.budget && <span className="font-medium text-green-700">Budget max : {request.budget.toLocaleString()} MAD</span>}
            {request.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{request.phone}</span>}
          </div>
          {request.notes && <p className="text-xs text-gray-400">{request.notes}</p>}

          {myOffer && (
            <div className={`mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full ${OFFER_STATUS[myOffer.status]?.cls}`}>
              Votre offre : {myOffer.price.toLocaleString()} MAD — {OFFER_STATUS[myOffer.status]?.label}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowOffer(v => !v)}
          className={`shrink-0 text-sm flex items-center justify-center gap-1 w-full sm:w-fit ${myOffer ? 'btn-secondary' : 'btn-primary'} py-1.5`}
        >
          <Send className="w-3.5 h-3.5" />
          {myOffer ? 'Modifier l\'offre' : 'Faire une offre'}
        </button>
      </div>

      {showOffer && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <OfferForm agencyId={agencyId} request={request} onClose={() => setShowOffer(false)} />
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RentalRequests() {
  const { agencyId } = useParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState('incoming')
  const [showForm, setShowForm] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['requestSettings', agencyId],
    queryFn: () => getRequestSettings(agencyId).then(r => r.data),
  })

  const { data: myRequests = [], isLoading: myLoading } = useQuery({
    queryKey: ['myRequests', agencyId],
    queryFn: () => getMyRequests(agencyId).then(r => r.data),
    enabled: tab === 'my',
  })

  const { data: incoming = [], isLoading: incomingLoading } = useQuery({
    queryKey: ['incomingRequests', agencyId],
    queryFn: () => getIncomingRequests(agencyId).then(r => r.data),
    enabled: tab === 'incoming',
  })

  const settingsMutation = useMutation({
    mutationFn: (val) => updateRequestSettings(agencyId, { acceptsRentalRequests: val }),
    onSuccess: () => { qc.invalidateQueries(['requestSettings', agencyId]); toast.success('Paramètre mis à jour') },
  })

  const accepts = settings?.acceptsRentalRequests ?? false

  const pendingOffersCount = myRequests.reduce((sum, r) =>
    sum + (r.offers?.filter(o => o.status === 'PENDING').length || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Demandes de location</h1>
          <p className="text-sm text-gray-500 mt-0.5">Publiez une demande pour trouver un véhicule chez d'autres agences</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-fit shrink-0">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </button>
      </div>

      {/* Opt-in toggle */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-medium text-gray-700">Recevoir les demandes des autres agences</p>
          <p className="text-sm text-gray-500">
            {accepts
              ? 'Activé — vous voyez les demandes publiées par d\'autres agences et pouvez y répondre.'
              : 'Désactivé — activez pour voir les demandes des autres agences et faire des offres.'}
          </p>
        </div>
        <button
          onClick={() => settingsMutation.mutate(!accepts)}
          className={`flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-fit shrink-0 ${accepts ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {accepts
            ? <><ToggleRight className="w-5 h-5" /> Activé</>
            : <><ToggleLeft className="w-5 h-5" /> Désactivé</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setTab('my')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === 'my' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Mes demandes
          {pendingOffersCount > 0 && (
            <span className="ml-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full inline-flex items-center justify-center">
              {pendingOffersCount}
            </span>
          )}
        </button>
        <button onClick={() => setTab('incoming')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === 'incoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Demandes reçues
        </button>
      </div>

      {/* My requests */}
      {tab === 'my' && (
        <div className="space-y-4">
          {myLoading && <p className="text-center py-10 text-gray-400">Chargement...</p>}
          {!myLoading && myRequests.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune demande publiée</p>
              <p className="text-sm mt-1">Créez une demande pour trouver un véhicule chez vos partenaires</p>
            </div>
          )}
          {myRequests.map(r => <MyRequestCard key={r.id} agencyId={agencyId} request={r} />)}
        </div>
      )}

      {/* Incoming requests */}
      {tab === 'incoming' && (
        <div className="space-y-4">
          {!accepts && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              Activez l'option ci-dessus pour voir les demandes des autres agences et faire des offres.
            </div>
          )}
          {accepts && incomingLoading && <p className="text-center py-10 text-gray-400">Chargement...</p>}
          {accepts && !incomingLoading && incoming.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune demande ouverte pour l'instant</p>
            </div>
          )}
          {accepts && incoming.map(r => <IncomingRequestCard key={r.id} agencyId={agencyId} request={r} />)}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouvelle demande de location">
        <RequestForm agencyId={agencyId} onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  )
}
