import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDashboard, getCarsCalendar, getCarAvailability, checkAvailability } from '../../api'
import { Car, FileText, CheckCircle, AlertTriangle, DollarSign, Clock, Wrench, Shield, ChevronLeft, ChevronRight, CalendarDays, Search, Building2, Gauge, CalendarClock } from 'lucide-react'
import { format, differenceInDays, parseISO, getDaysInMonth, addMonths, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useState } from 'react'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'
const fmtDays = (d) => {
  const days = differenceInDays(new Date(d), new Date())
  if (days < 0) return <span className="text-red-600">Expiré</span>
  if (days === 0) return <span className="text-orange-600">Aujourd'hui</span>
  return <span className={days <= 7 ? 'text-orange-600' : 'text-gray-600'}>{days} jour(s)</span>
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600', red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card flex items-start gap-2.5 sm:gap-4">
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${colors[color]}`}><Icon className="w-5 h-5 sm:w-6 sm:h-6" /></div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">{label}</p>
        <p className="text-lg sm:text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function AlertsSection({ title, items, icon: Icon, renderItem }) {
  if (!items?.length) return null
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-orange-500" />
        <h3 className="font-semibold">{title} <span className="ml-1 text-sm text-orange-500">({items.length})</span></h3>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => <div key={i} className="text-sm">{renderItem(item)}</div>)}
      </div>
    </div>
  )
}

const STATUS_COLORS = { PENDING: 'bg-yellow-400', RESERVATION: 'bg-purple-400', RESERVATION_CONFIRMED: 'bg-teal-400', ACTIVE: 'bg-green-500', COMPLETED: 'bg-gray-400' }
const STATUS_LABELS = { PENDING: 'En attente', RESERVATION: 'Réservation', RESERVATION_CONFIRMED: 'Réservation confirmée' }
const STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  RESERVATION: 'bg-purple-100 text-purple-800',
  RESERVATION_CONFIRMED: 'bg-teal-100 text-teal-800',
}

function fmtCountdown(d) {
  const days = differenceInDays(new Date(d), new Date())
  if (days === 0) return { label: "Aujourd'hui", cls: 'text-orange-600 font-semibold' }
  if (days === 1) return { label: 'Demain', cls: 'text-orange-500 font-semibold' }
  return { label: `Dans ${days} jour${days > 1 ? 's' : ''}`, cls: 'text-blue-600 font-medium' }
}

function UpcomingStartsSection({ contracts, agencyId }) {
  if (!contracts?.length) return null
  return (
    <div className="card border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-blue-900">
          Départs dans les 7 jours <span className="ml-1 text-sm text-blue-400">({contracts.length})</span>
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {contracts.map(c => {
          const countdown = fmtCountdown(c.startDate)
          return (
            <div key={c.id} className="flex flex-col gap-1.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs text-blue-400">{c.contractNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status]}`}>
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
              <p className="font-semibold text-gray-800 leading-tight">{c.clientName}</p>
              {c.clientPhone && <p className="text-xs text-gray-500">{c.clientPhone}</p>}
              <p className="text-xs text-gray-600">
                <Car className="w-3 h-3 inline mr-1 text-gray-400" />
                {c.car?.brand} {c.car?.model}
                {(c.car?.finalPlate || c.car?.wwPlate) && (
                  <span className="text-gray-400 ml-1">· {c.car?.finalPlate || c.car?.wwPlate}</span>
                )}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-500">Départ le {fmtDate(c.startDate)}</span>
                <span className={`text-xs ${countdown.cls}`}>{countdown.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TechInspectionSection({ cars }) {
  const hasItems = cars?.length > 0
  return (
    <div className={`card ${hasItems ? 'border-amber-200' : 'border-gray-100'}`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className={`w-5 h-5 ${hasItems ? 'text-amber-500' : 'text-gray-300'}`} />
        <h3 className={`font-semibold ${hasItems ? 'text-amber-900' : 'text-gray-500'}`}>
          Contrôles techniques — 30 jours
          {hasItems && <span className="ml-1 text-sm text-amber-400">({cars.length})</span>}
        </h3>
      </div>
      {!hasItems ? (
        <div className="flex items-center gap-2 text-green-600 text-sm py-1">
          <CheckCircle className="w-4 h-4" />
          <span>Aucun contrôle technique à renouveler dans les 30 jours</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {cars.map(c => {
            const days = differenceInDays(new Date(c.nextTechnicalInspection), new Date())
            const urgent = days <= 7
            const warning = days <= 15
            return (
              <div key={c.id} className={`flex flex-col gap-1 p-3 rounded-xl border ${urgent ? 'bg-red-50 border-red-200' : warning ? 'bg-amber-50 border-amber-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className="font-semibold text-gray-800 leading-tight">
                  {c.brand} {c.model}
                  <span className="text-gray-400 text-xs font-normal ml-1.5">{c.finalPlate || c.wwPlate}</span>
                </p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-gray-500">Expire le {fmtDate(c.nextTechnicalInspection)}</span>
                  <span className={`text-xs font-semibold ${urgent ? 'text-red-600' : warning ? 'text-amber-600' : 'text-yellow-700'}`}>
                    {days === 0 ? "Aujourd'hui" : days < 0 ? `Expiré (${Math.abs(days)}j)` : `Dans ${days} j.`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AvailabilitySearch({ agencyId }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [includePartners, setIncludePartners] = useState(false)
  const [searched, setSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ownCars, setOwnCars] = useState([])
  const [partnerCars, setPartnerCars] = useState([])

  const handleSearch = async () => {
    if (!startDate || !endDate) return
    setIsLoading(true)
    setSearched(true)
    try {
      const [ownRes, partnerRes] = await Promise.all([
        getCarAvailability(agencyId, { startDate, endDate }),
        includePartners ? checkAvailability(agencyId, { startDate, endDate }) : Promise.resolve({ data: null }),
      ])
      setOwnCars(ownRes.data || [])
      setPartnerCars(partnerRes.data?.partnerCars || [])
    } catch {
      setOwnCars([])
      setPartnerCars([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-gray-700">Voitures disponibles sur une période</h3>
      </div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
        <div className="w-full sm:w-auto">
          <label className="label text-xs">Date début</label>
          <input className="input py-1.5 text-sm" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="w-full sm:w-auto">
          <label className="label text-xs">Date fin</label>
          <input className="input py-1.5 text-sm" type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer sm:pb-1">
          <input type="checkbox" className="rounded" checked={includePartners} onChange={e => setIncludePartners(e.target.checked)} />
          <Building2 className="w-3.5 h-3.5 text-purple-500" /> Partenaires
        </label>
        <button className="btn-primary py-1.5 text-sm flex items-center justify-center gap-2 w-full sm:w-fit" onClick={handleSearch} disabled={!startDate || !endDate}>
          <Search className="w-3.5 h-3.5" /> Chercher
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Recherche...</p>}

      {searched && !isLoading && (
        <div className="space-y-3">
          {ownCars.length === 0 && partnerCars.length === 0 && (
            <p className="text-sm text-gray-400">Aucune voiture disponible sur cette période</p>
          )}
          {ownCars.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Votre agence ({ownCars.length})</p>
              <div className="flex flex-wrap gap-2">
                {ownCars.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 text-xs px-2.5 py-1 rounded-full font-medium">
                    <Car className="w-3 h-3" />
                    {c.brand} {c.model}
                    {(c.finalPlate || c.wwPlate) && <span className="text-green-600 font-normal">· {c.finalPlate || c.wwPlate}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {partnerCars.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Partenaires ({partnerCars.length})</p>
              <div className="flex flex-wrap gap-2">
                {partnerCars.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-xs px-2.5 py-1 rounded-full font-medium">
                    <Building2 className="w-3 h-3" />
                    {c.brand} {c.model}
                    {(c.finalPlate || c.wwPlate) && <span className="text-purple-600 font-normal">· {c.finalPlate || c.wwPlate}</span>}
                    <span className="text-purple-400 font-normal">— {c.ownerAgency?.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MiniGantt({ agencyId }) {
  const [current, setCurrent] = useState(new Date())
  const year = current.getFullYear()
  const month = current.getMonth() + 1
  const daysCount = getDaysInMonth(current)
  const days = Array.from({ length: daysCount }, (_, i) => i + 1)
  const today = new Date().getDate()
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() + 1 === month

  const { data, isLoading } = useQuery({
    queryKey: ['calendarDash', agencyId, year, month],
    queryFn: () => getCarsCalendar(agencyId, { year, month }).then(r => r.data),
  })

  const colW = 22
  const monthLabel = format(current, 'MMMM yyyy', { locale: fr })

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-sm">Disponibilité des véhicules</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrent(d => subMonths(d, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4 text-gray-400" /></button>
          <span className="text-xs font-medium capitalize w-28 text-center">{monthLabel}</span>
          <button onClick={() => setCurrent(d => addMonths(d, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4 text-gray-400" /></button>
          <Link to={`/agency/${agencyId}/calendar`} className="text-xs text-blue-600 hover:underline ml-2">Voir tout →</Link>
        </div>
      </div>
      {isLoading && <p className="text-xs text-gray-400 py-4 text-center">Chargement...</p>}
      {!isLoading && data && (
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${120 + daysCount * colW}px` }}>
            <div className="flex border-b border-gray-100 bg-gray-50">
              <div className="flex-shrink-0 w-28 text-xs text-gray-400 py-1 px-2 border-r border-gray-100">Voiture</div>
              {days.map(d => (
                <div key={d} style={{ width: colW }} className={`flex-shrink-0 text-center text-xs py-1 border-r border-gray-50 ${isCurrentMonth && d === today ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-300'}`}>{d}</div>
              ))}
            </div>
            {data.cars.map((car, ci) => (
              <div key={car.id} className={`flex border-b border-gray-50 relative ${ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`} style={{ height: 32 }}>
                <div className="flex-shrink-0 w-28 px-2 flex items-center border-r border-gray-100 overflow-hidden">
                  <span className="text-xs truncate text-gray-600">{car.brand} {car.model}</span>
                </div>
                <div className="relative flex-1 flex">
                  {days.map(d => (
                    <div key={d} style={{ width: colW }} className={`flex-shrink-0 h-full border-r border-gray-50 ${isCurrentMonth && d === today ? 'bg-blue-50' : ''}`} />
                  ))}
                  {car.contracts.map(c => {
                    const monthStart = new Date(year, month - 1, 1)
                    const monthEnd = new Date(year, month - 1, daysCount)
                    const cStart = parseISO(c.startDate)
                    const cEnd = parseISO(c.endDate)
                    const ds = (cStart < monthStart ? monthStart : cStart).getDate()
                    const de = (cEnd > monthEnd ? monthEnd : cEnd).getDate()
                    const span = de - ds + 1
                    return (
                      <div key={c.id}
                        style={{ position: 'absolute', left: `${(ds - 1) * colW}px`, width: `${span * colW - 2}px`, top: 5, height: 22 }}
                        className={`${STATUS_COLORS[c.status] || 'bg-blue-400'} rounded text-white text-xs flex items-center px-1.5 overflow-hidden`}
                        title={`${c.clientName} · ${c.contractNumber}`}
                      >
                        <span className="truncate text-xs">{c.clientName}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {!data.cars.length && <p className="text-xs text-gray-400 py-4 text-center">Aucune voiture</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-400 inline-block" /> En attente</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500 inline-block" /> Actif</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-400 inline-block" /> Terminé</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AgencyDashboard() {
  const { agencyId } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', agencyId],
    queryFn: () => getDashboard(agencyId).then(r => r.data),
  })

  if (isLoading) return <div className="text-center py-12 text-gray-400">Chargement...</div>
  if (!data) return null

  const { stats, alerts, billingAlert } = data
  const fmt = (n) => `${n.toLocaleString('fr-MA')} MAD`

  return (
    <div className="space-y-6">
      {billingAlert && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-800">Facturation à régulariser</h3>
              <p className="text-sm text-red-700 mt-0.5">
                Votre période de facturation s'est terminée le {format(new Date(billingAlert.lastPeriodEnd), 'dd/MM/yyyy', { locale: fr })}
                {' '}({billingAlert.daysOverdue} jour(s) de retard) et aucune nouvelle facture n'a encore été émise pour la période suivante.
                Merci de contacter la plateforme pour régulariser votre situation.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Disponibles aujourd'hui" value={stats.carsAvailableToday ?? stats.availableCars} sub={`${stats.totalCars} au total`} icon={Car} color="green" />
        <StatCard label="En location" value={stats.rentedCars} icon={Car} color="orange" />
        <StatCard label="Contrats actifs" value={stats.activeContracts} sub={`${stats.pendingContracts} en attente`} icon={FileText} color="blue" />
        <StatCard label="Solde en espèces" value={fmt(stats.cashBalance ?? stats.balance)} sub={`Revenus: ${fmt(stats.totalIncome)}`} icon={DollarSign} color="purple" />
      </div>

      {stats.partnerCarsTotal > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Partenaires disponibles" value={stats.partnerCarsAvailableToday} sub={`${stats.partnerCarsTotal} au total`} icon={Building2} color="green" />
          <StatCard label="Partenaires loués par nous" value={stats.partnerCarsRentedByUs} icon={Building2} color="orange" />
        </div>
      )}

      <UpcomingStartsSection contracts={alerts.contractsStartingSoon} agencyId={agencyId} />

      <TechInspectionSection cars={alerts.carsTechExpiring} />

      {alerts.contractsReturningSoon?.length > 0 && (
        <div className="card border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-orange-800">
              Retours attendus dans les 3 jours <span className="ml-1 text-sm text-orange-500">({alerts.contractsReturningSoon.length})</span>
            </h3>
          </div>
          <div className="space-y-2">
            {alerts.contractsReturningSoon.map(c => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-orange-100 last:border-0 text-sm">
                <div>
                  <p className="font-medium">{c.clientName}</p>
                  <p className="text-gray-500 text-xs">{c.car?.brand} {c.car?.model} · {c.car?.finalPlate || c.car?.wwPlate}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-gray-500">Retour le</p>
                  <p className="text-sm">{fmtDate(c.endDate)}</p>
                  {fmtDays(c.endDate)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AlertsSection
          title="Contrats se terminant bientôt"
          items={alerts.contractsEndingSoon}
          icon={Clock}
          renderItem={(c) => (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-medium">{c.clientName}</p>
                <p className="text-gray-500 text-xs">{c.car?.brand} {c.car?.model} · {c.car?.finalPlate || c.car?.wwPlate}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-gray-500">Retour le</p>
                <p className="text-sm">{fmtDate(c.endDate)}</p>
                {fmtDays(c.endDate)}
              </div>
            </div>
          )}
        />

        <AlertsSection
          title="Assurances expirant dans 30 jours"
          items={alerts.carsInsuranceExpiring}
          icon={Shield}
          renderItem={(c) => (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-gray-50 last:border-0">
              <p className="font-medium">{c.brand} {c.model} <span className="text-gray-400 text-xs">{c.finalPlate || c.wwPlate}</span></p>
              <span>{fmtDate(c.insuranceExpiry)} — {fmtDays(c.insuranceExpiry)}</span>
            </div>
          )}
        />

        <AlertsSection
          title="Vidanges à prévoir (date)"
          items={alerts.oilChangeDue}
          icon={Wrench}
          renderItem={(c) => (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-gray-50 last:border-0">
              <p className="font-medium">{c.car?.brand} {c.car?.model} <span className="text-gray-400 text-xs">{c.car?.finalPlate}</span></p>
              <span>{fmtDate(c.nextDate)} — {fmtDays(c.nextDate)}</span>
            </div>
          )}
        />

        <AlertsSection
          title="Vidanges à prévoir (kilométrage)"
          items={alerts.oilChangeDueByKm}
          icon={Gauge}
          renderItem={(c) => (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-medium">{c.car?.brand} {c.car?.model} <span className="text-gray-400 text-xs">{c.car?.finalPlate || c.car?.wwPlate}</span></p>
                <p className="text-xs text-gray-400">{c.kmSince.toLocaleString()} km depuis dernière vidange · actuel : {c.currentMileage.toLocaleString()} km</p>
              </div>
              <span className={`text-sm font-semibold ${c.kmRemaining <= 0 ? 'text-red-600' : c.kmRemaining <= 500 ? 'text-orange-600' : 'text-yellow-600'}`}>
                {c.kmRemaining <= 0 ? `Dépassé de ${Math.abs(c.kmRemaining).toLocaleString()} km` : `${c.kmRemaining.toLocaleString()} km restants`}
              </span>
            </div>
          )}
        />

        <AlertsSection
          title="Réparations planifiées"
          items={alerts.repairsUpcoming}
          icon={Wrench}
          renderItem={(c) => (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-medium">{c.car?.brand} {c.car?.model}</p>
                <p className="text-gray-500 text-xs">{c.nextRepairDescription}</p>
              </div>
              <span>{fmtDate(c.nextRepairDate)} — {fmtDays(c.nextRepairDate)}</span>
            </div>
          )}
        />
      </div>

      {(stats.checksIssuedUnused > 0 || stats.checksReceivedUnused > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.checksIssuedUnused > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-orange-300 bg-orange-50 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <span className="text-orange-600 text-lg font-bold">!</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Chèques émis non exploités</p>
                <p className="text-3xl font-bold text-orange-700">{stats.checksIssuedUnused}</p>
              </div>
            </div>
          )}
          {stats.checksReceivedUnused > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-orange-300 bg-orange-50 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <span className="text-orange-600 text-lg font-bold">!</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Chèques reçus non exploités</p>
                <p className="text-3xl font-bold text-orange-700">{stats.checksReceivedUnused}</p>
              </div>
            </div>
          )}
        </div>
      )}
      {stats.checksIssuedUnused === 0 && stats.checksReceivedUnused === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border bg-gray-50 border-gray-100">
            <p className="text-xs text-gray-500">Chèques émis non exploités</p>
            <p className="text-2xl font-bold text-gray-400">0</p>
          </div>
          <div className="p-4 rounded-xl border bg-gray-50 border-gray-100">
            <p className="text-xs text-gray-500">Chèques reçus non exploités</p>
            <p className="text-2xl font-bold text-gray-400">0</p>
          </div>
        </div>
      )}

      <MiniGantt agencyId={agencyId} />
    </div>
  )
}
