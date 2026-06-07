import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExternalCars, getExternalBookings, createExternalBooking, cancelExternalBooking, checkAvailability } from '../../api'
import Modal from '../../components/Modal'
import { Search, Car, Calendar, Trash2, Building2, AlertCircle, CheckCircle2, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'

const STATUS_LABELS = {
  PENDING: { label: 'En attente', cls: 'badge-yellow' },
  ACTIVE: { label: 'Actif', cls: 'badge-green' },
  COMPLETED: { label: 'Terminé', cls: 'bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full' },
  CANCELLED: { label: 'Annulé', cls: 'bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full' },
}

function BookingForm({ car, agencyId, onClose, prefilledStart, prefilledEnd }) {
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({
    clientName: '', clientPhone: '', clientEmail: '', clientIdNumber: '', clientAddress: '',
    startDate: prefilledStart || today, endDate: prefilledEnd || '', rentalAmount: '', guaranteeAmount: '', amountPaid: '', currency: 'MAD',
    guaranteeCheck: false, startMileage: '', notes: '',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const days = form.startDate && form.endDate
    ? Math.max(1, differenceInDays(new Date(form.endDate), new Date(form.startDate)) + 1)
    : 0

  const mutation = useMutation({
    mutationFn: (d) => createExternalBooking(agencyId, { ...d, carId: car.id }),
    onSuccess: () => {
      qc.invalidateQueries(['externalCars', agencyId])
      qc.invalidateQueries(['externalBookings', agencyId])
      toast.success('Réservation créée')
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
        <Car className="w-5 h-5 text-blue-600" />
        <div>
          <p className="font-semibold text-sm">{car.brand} {car.model}</p>
          <p className="text-xs text-gray-500">{car.finalPlate || car.wwPlate} · Agence : {car.ownerAgency?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="label">Client *</label><input className="input" value={form.clientName} onChange={set('clientName')} required placeholder="Nom complet" /></div>
        <div><label className="label">Téléphone</label><input className="input" value={form.clientPhone} onChange={set('clientPhone')} /></div>
        <div><label className="label">N° CIN / Passeport</label><input className="input" value={form.clientIdNumber} onChange={set('clientIdNumber')} /></div>
        <div><label className="label">Date début *</label><input className="input" type="date" value={form.startDate} onChange={set('startDate')} required /></div>
        <div><label className="label">Date fin *</label><input className="input" type="date" value={form.endDate} onChange={set('endDate')} min={form.startDate} required /></div>
        <div>
          <label className="label">Montant *</label>
          <input className="input" type="number" step="0.01" value={form.rentalAmount} onChange={set('rentalAmount')} required />
          {days > 0 && form.rentalAmount && (
            <p className="text-xs text-gray-400 mt-1">{days} j × {(form.rentalAmount / days).toFixed(0)} MAD/j</p>
          )}
        </div>
        <div><label className="label">Garantie</label><input className="input" type="number" step="0.01" value={form.guaranteeAmount} onChange={set('guaranteeAmount')} /></div>
        <div><label className="label">Montant encaissé ({form.currency || 'MAD'})</label><input className="input" type="number" step="0.01" min="0" value={form.amountPaid} onChange={set('amountPaid')} placeholder="0.00" /></div>
        <div><label className="label">Kilométrage départ</label><input className="input" type="number" value={form.startMileage} onChange={set('startMileage')} /></div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>Réserver</button>
      </div>
    </form>
  )
}

function AvailabilityTab({ agencyId }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [searched, setSearched] = useState(false)
  const [selectedCar, setSelectedCar] = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['availability', agencyId, startDate, endDate],
    queryFn: () => checkAvailability(agencyId, { startDate, endDate }).then(r => r.data),
    enabled: false,
  })

  const handleSearch = () => {
    if (!startDate || !endDate) return
    setSearched(true)
    refetch()
  }

  const days = startDate && endDate
    ? Math.max(1, differenceInDays(new Date(endDate), new Date(startDate)) + 1)
    : 0

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Date début *</label>
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Date fin *</label>
          <input className="input" type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {days > 0 && <p className="text-sm text-gray-500 pb-1">{days} jour(s)</p>}
        <button className="btn-primary flex items-center gap-2" onClick={handleSearch} disabled={!startDate || !endDate}>
          <CheckCircle2 className="w-4 h-4" /> Voir les disponibilités
        </button>
      </div>

      {isLoading && <p className="text-center py-10 text-gray-400">Recherche en cours...</p>}

      {searched && !isLoading && data && (
        <div className="space-y-6">
          {/* Own cars */}
          <div>
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Home className="w-4 h-4 text-blue-500" /> Votre agence — {data.ownCars.length} voiture(s) disponible(s)
            </h3>
            {data.ownCars.length === 0 && (
              <p className="text-sm text-gray-400">Aucune voiture disponible dans votre agence sur cette période</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.ownCars.map(car => (
                <div key={car.id} className="card p-4 space-y-2 border-l-4 border-l-blue-400">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{car.brand} {car.model} {car.year && `(${car.year})`}</h4>
                      <p className="text-xs text-gray-500">{car.finalPlate || car.wwPlate || '—'} · {car.color || ''}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Votre agence</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Partner cars */}
          <div>
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-purple-500" /> Agences partenaires — {data.partnerCars.length} voiture(s) disponible(s)
            </h3>
            {data.partnerCars.length === 0 && (
              <p className="text-sm text-gray-400">Aucune voiture disponible chez les partenaires sur cette période</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.partnerCars.map(car => (
                <div key={car.id} className="card p-4 space-y-2 border-l-4 border-l-purple-400">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{car.brand} {car.model} {car.year && `(${car.year})`}</h4>
                      <p className="text-xs text-gray-500">{car.finalPlate || car.wwPlate || '—'} · {car.color || ''}</p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{car.ownerAgency?.name}</span>
                  </div>
                  <button
                    onClick={() => setSelectedCar({ ...car, prefilledStart: startDate, prefilledEnd: endDate })}
                    className="btn-primary w-full text-sm py-1.5 flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Réserver
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={!!selectedCar} onClose={() => setSelectedCar(null)} title="Nouvelle réservation partenaire">
        {selectedCar && (
          <BookingForm
            car={selectedCar}
            agencyId={agencyId}
            prefilledStart={selectedCar.prefilledStart}
            prefilledEnd={selectedCar.prefilledEnd}
            onClose={() => setSelectedCar(null)}
          />
        )}
      </Modal>
    </div>
  )
}

export default function ExternalCars() {
  const { agencyId } = useParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState('availability')
  const [search, setSearch] = useState('')
  const [selectedCar, setSelectedCar] = useState(null)

  const { data: cars = [], isLoading: carsLoading } = useQuery({
    queryKey: ['externalCars', agencyId, search],
    queryFn: () => getExternalCars(agencyId, search ? { search } : {}).then(r => r.data),
  })

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['externalBookings', agencyId],
    queryFn: () => getExternalBookings(agencyId).then(r => r.data),
    enabled: tab === 'bookings',
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelExternalBooking(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['externalBookings', agencyId]); toast.success('Réservation annulée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const tabs = [
    { id: 'availability', label: 'Disponibilité par dates' },
    { id: 'search', label: 'Voitures dont j\'ai accès' },
    { id: 'bookings', label: 'Mes réservations' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Marque, modèle, immatriculation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {carsLoading && <p className="text-center py-10 text-gray-400">Chargement...</p>}

          {!carsLoading && cars.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune voiture disponible chez vos partenaires</p>
              <p className="text-sm mt-1">Vérifiez que vos partenaires vous ont bien accordé l'accès dans leur onglet Accès</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {cars.map(car => (
              <div key={car.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{car.brand} {car.model} {car.year && `(${car.year})`}</h3>
                    <p className="text-sm text-gray-500">{car.finalPlate || car.wwPlate || '—'} · {car.color || ''} · {car.fuelType || ''}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Disponible</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Building2 className="w-3 h-3" />
                  <span>{car.ownerAgency?.name}</span>
                </div>
                {car.mileage && <p className="text-xs text-gray-500">{car.mileage.toLocaleString()} km</p>}
                <button
                  onClick={() => setSelectedCar(car)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Réserver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'bookings' && (
        <div>
          {bookingsLoading && <p className="text-center py-10 text-gray-400">Chargement...</p>}
          {!bookingsLoading && bookings.length === 0 && (
            <p className="text-center py-14 text-gray-400">Aucune réservation chez les partenaires</p>
          )}
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="card flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.car?.brand} {b.car?.model}</span>
                    <span className="text-xs text-gray-400">{b.car?.finalPlate}</span>
                    <span className={STATUS_LABELS[b.status]?.cls}>{STATUS_LABELS[b.status]?.label}</span>
                  </div>
                  <p className="text-sm text-gray-600">{b.clientName}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{b.agency?.name}</span>
                    <span>{fmtDate(b.startDate)} → {fmtDate(b.endDate)}</span>
                    <span className="font-medium">{b.rentalAmount?.toLocaleString()} MAD</span>
                  </div>
                  <p className="text-xs text-gray-400">Réf: {b.contractNumber}</p>
                </div>
                {(b.status === 'PENDING') && (
                  <button
                    onClick={() => { if (confirm('Annuler cette réservation ?')) cancelMutation.mutate(b.id) }}
                    className="p-1.5 hover:bg-red-50 rounded text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'availability' && <AvailabilityTab agencyId={agencyId} />}

      <Modal isOpen={!!selectedCar} onClose={() => setSelectedCar(null)} title="Nouvelle réservation partenaire">
        {selectedCar && <BookingForm car={selectedCar} agencyId={agencyId} onClose={() => setSelectedCar(null)} />}
      </Modal>
    </div>
  )
}
