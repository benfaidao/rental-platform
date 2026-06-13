import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getContracts, getCars, getClients } from '../../api'
import { Search, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'
const STATUS = { PENDING: 'En attente', RESERVATION: 'Réservation', RESERVATION_CONFIRMED: 'Réservation confirmée', ACTIVE: 'En cours', COMPLETED: 'Terminé', CANCELLED: 'Annulé' }
const STATUS_BADGE = { PENDING: 'badge-yellow', RESERVATION: 'badge-purple', RESERVATION_CONFIRMED: 'badge-teal', ACTIVE: 'badge-green', COMPLETED: 'badge-blue', CANCELLED: 'badge-red' }

function ClientCombo({ agencyId, value, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', agencyId, search],
    queryFn: () => getClients(agencyId, search ? { search } : {}).then(r => r.data),
    enabled: search.length >= 1,
  })

  const selected = value?.name || ''

  return (
    <div className="relative w-full sm:w-52">
      <input
        className="input w-full"
        placeholder="Rechercher client..."
        value={search || selected}
        onChange={e => { setSearch(e.target.value); if (!e.target.value) onChange(null); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && clients.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {clients.map(c => (
            <button key={c.id} type="button"
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
              onClick={() => { onChange({ id: c.id, name: `${c.firstName} ${c.lastName}` }); setSearch(''); setOpen(false) }}
            >
              <span className="font-medium">{c.firstName} {c.lastName}</span>
              {c.phone && <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CarCombo({ cars, value, onChange }) {
  const [search, setSearch] = useState('')
  const filtered = search
    ? cars.filter(c => `${c.brand} ${c.model} ${c.finalPlate || ''} ${c.wwPlate || ''}`.toLowerCase().includes(search.toLowerCase()))
    : cars

  return (
    <select className="input w-full sm:w-48" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Tous les véhicules</option>
      {filtered.map(c => (
        <option key={c.id} value={c.id}>{c.brand} {c.model} — {c.finalPlate || c.wwPlate}</option>
      ))}
    </select>
  )
}

export default function History() {
  const { agencyId } = useParams()
  const [clientFilter, setClientFilter] = useState(null)
  const [carFilter, setCarFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const { data: cars = [] } = useQuery({
    queryKey: ['cars', agencyId],
    queryFn: () => getCars(agencyId).then(r => r.data),
  })

  const params = {}
  if (clientFilter?.id) params.clientId = clientFilter.id
  if (carFilter) params.carId = carFilter
  if (statusFilter) params.status = statusFilter
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['history', agencyId, params],
    queryFn: () => getContracts(agencyId, params).then(r => r.data),
  })

  const filtered = contracts.filter(c =>
    !search ||
    c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.clientName.toLowerCase().includes(search.toLowerCase()) ||
    (c.clientPhone || '').includes(search)
  )

  const totalAmount = filtered.reduce((s, c) => s + c.rentalAmount, 0)
  const days = (c) => Math.ceil((new Date(c.endDate) - new Date(c.startDate)) / (1000 * 60 * 60 * 24))

  const resetFilters = () => {
    setClientFilter(null); setCarFilter(''); setStatusFilter('')
    setDateFrom(''); setDateTo(''); setSearch('')
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-sm text-gray-700">Filtres</span>
          <button onClick={resetFilters} className="ml-auto text-xs text-blue-500 hover:underline">Réinitialiser</button>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 w-full" placeholder="N° contrat, client..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <ClientCombo agencyId={agencyId} value={clientFilter} onChange={setClientFilter} />
          <CarCombo cars={cars} value={carFilter} onChange={setCarFilter} />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {['', 'PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s ? STATUS[s] : 'Tous'}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">Période départ :</span>
          <div className="flex items-center gap-2">
            <input className="input w-full sm:w-36 text-sm" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="text-xs text-gray-400 shrink-0">→</span>
            <input className="input w-full sm:w-36 text-sm" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-500">{filtered.length} contrat(s)</span>
        {filtered.length > 0 && (
          <span className="font-medium text-gray-700">Total : {totalAmount.toLocaleString('fr-MA')} MAD</span>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {isLoading && <p className="text-center py-8 text-gray-400">Chargement...</p>}
        {filtered.map(c => (
          <div key={c.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.clientName}</p>
                {c.clientPhone && <p className="text-xs text-gray-400">{c.clientPhone}</p>}
              </div>
              <span className={`${STATUS_BADGE[c.status]} shrink-0`}>{STATUS[c.status]}</span>
            </div>
            <p className="text-xs font-mono text-gray-400">{c.contractNumber}</p>
            <p className="text-sm text-gray-600">{c.car?.brand} {c.car?.model} <span className="text-gray-400">{c.car?.finalPlate || c.car?.wwPlate}</span></p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
              <span>{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>
              <span>{days(c)}j</span>
            </div>
            <p className="font-semibold text-sm">{c.rentalAmount.toLocaleString()} {c.currency}</p>
          </div>
        ))}
        {!isLoading && !filtered.length && <p className="text-center py-8 text-gray-400">Aucun résultat</p>}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['N° Contrat', 'Client', 'Véhicule', 'Départ', 'Retour', 'Durée', 'Montant', 'Statut'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="py-8 text-center text-gray-400">Chargement...</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono text-xs font-medium">{c.contractNumber}</td>
                <td className="py-3 px-4">
                  <p className="font-medium">{c.clientName}</p>
                  {c.clientPhone && <p className="text-xs text-gray-400">{c.clientPhone}</p>}
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {c.car?.brand} {c.car?.model}
                  <br /><span className="text-xs text-gray-400">{c.car?.finalPlate || c.car?.wwPlate}</span>
                </td>
                <td className="py-3 px-4 text-gray-600">{fmtDate(c.startDate)}</td>
                <td className="py-3 px-4 text-gray-600">{fmtDate(c.endDate)}</td>
                <td className="py-3 px-4 text-gray-500">{days(c)}j</td>
                <td className="py-3 px-4 font-medium">{c.rentalAmount.toLocaleString()} {c.currency}</td>
                <td className="py-3 px-4"><span className={STATUS_BADGE[c.status]}>{STATUS[c.status]}</span></td>
              </tr>
            ))}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">Aucun résultat</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
