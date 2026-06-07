import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCarsCalendar } from '../../api'
import { ChevronLeft, ChevronRight, Car, Building2, Search } from 'lucide-react'
import {
  format, eachDayOfInterval, isWithinInterval,
  parseISO, getDaysInMonth, addMonths, subMonths, getDay,
} from 'date-fns'
import { fr } from 'date-fns/locale'

const CAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500',
  'bg-emerald-500', 'bg-cyan-500', 'bg-red-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-orange-500', 'bg-lime-500', 'bg-sky-500',
]
const STATUS_COLORS = { PENDING: 'bg-yellow-400', RESERVATION: 'bg-purple-400', RESERVATION_CONFIRMED: 'bg-teal-400', ACTIVE: 'bg-green-500', COMPLETED: 'bg-gray-400' }

// is car booked on a given day?
function isBooked(car, day) {
  return car.contracts.some(c => {
    const cs = parseISO(c.startDate)
    const ce = parseISO(c.endDate)
    return isWithinInterval(day, { start: cs, end: ce }) && c.status !== 'CANCELLED'
  })
}

// ─── Gantt View ───────────────────────────────────────────────────────────────
function GanttView({ cars, year, month }) {
  const daysCount = getDaysInMonth(new Date(year, month - 1))
  const days = Array.from({ length: daysCount }, (_, i) => i + 1)
  const today = new Date().getDate()
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() + 1 === month
  const colW = 32

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${176 + daysCount * colW}px` }}>
        {/* Header */}
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="flex-shrink-0 w-44 px-3 py-2 text-xs font-medium text-gray-500 border-r border-gray-200">Voiture</div>
          {days.map(d => (
            <div key={d} style={{ width: colW }}
              className={`flex-shrink-0 text-center text-xs py-2 border-r border-gray-100 font-medium
                ${isCurrentMonth && d === today ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Car rows */}
        {cars.map((car, carIdx) => (
          <div key={car.id}
            className={`flex border-b border-gray-100 relative ${carIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
            style={{ height: 46 }}>
            {/* Car label */}
            <div className="flex-shrink-0 w-44 px-3 flex items-center gap-1.5 border-r border-gray-200 overflow-hidden">
              {car.isPartner
                ? <Building2 className="w-3 h-3 text-purple-400 flex-shrink-0" />
                : <Car className="w-3 h-3 text-gray-400 flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{car.brand} {car.model}</p>
                <p className="text-xs text-gray-400 truncate">
                  {car.finalPlate || car.wwPlate || '—'}
                  {car.isPartner && car.ownerAgency && <span className="text-purple-400 ml-1">· {car.ownerAgency.name}</span>}
                </p>
              </div>
            </div>

            {/* Day cells */}
            <div className="relative flex-1 flex">
              {days.map(d => (
                <div key={d} style={{ width: colW }}
                  className={`flex-shrink-0 h-full border-r border-gray-100
                    ${isCurrentMonth && d === today ? 'bg-blue-50' : ''}`} />
              ))}

              {/* Contract bars */}
              {car.contracts.map(c => {
                const monthStart = new Date(year, month - 1, 1)
                const monthEnd = new Date(year, month - 1, daysCount)
                const cStart = parseISO(c.startDate)
                const cEnd = parseISO(c.endDate)
                const ds = (cStart < monthStart ? monthStart : cStart).getDate()
                const de = (cEnd > monthEnd ? monthEnd : cEnd).getDate()
                const span = de - ds + 1
                const color = car.isPartner ? 'bg-purple-500' : (STATUS_COLORS[c.status] || 'bg-blue-400')

                return (
                  <div key={c.id}
                    style={{ position: 'absolute', left: `${(ds - 1) * colW}px`, width: `${span * colW - 2}px`, top: 9, height: 28 }}
                    className={`${color} rounded text-white text-xs flex items-center px-2 overflow-hidden cursor-default shadow-sm`}
                    title={`${c.clientName} · ${c.contractNumber} · ${format(cStart, 'dd/MM')}–${format(cEnd, 'dd/MM')}`}>
                    <span className="truncate">{c.clientName}</span>
                  </div>
                )
              })}
              {/* Unavailability bars (orange) */}
              {(car.unavailabilities || []).map(u => {
                const monthStart = new Date(year, month - 1, 1)
                const monthEnd = new Date(year, month - 1, daysCount)
                const uStart = new Date(u.startDate)
                const uEnd = new Date(u.endDate)
                const ds = (uStart < monthStart ? monthStart : uStart).getDate()
                const de = (uEnd > monthEnd ? monthEnd : uEnd).getDate()
                const span = de - ds + 1
                return (
                  <div key={u.id}
                    style={{ position: 'absolute', left: `${(ds - 1) * colW}px`, width: `${span * colW - 2}px`, top: 9, height: 28 }}
                    className="bg-orange-400 rounded text-white text-xs flex items-center px-2 overflow-hidden cursor-default shadow-sm opacity-80"
                    title={u.reason ? `Indisponible : ${u.reason}` : 'Indisponible'}>
                    <span className="truncate">{u.reason || 'Indisponible'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {!cars.length && <div className="py-14 text-center text-gray-400 text-sm">Aucune voiture</div>}
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> En attente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Actif</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400 inline-block" /> Terminé</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> Partenaire</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Indisponible</span>
      </div>
    </div>
  )
}

// ─── Monthly View ─────────────────────────────────────────────────────────────
function MonthlyView({ cars, year, month }) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month - 1, getDaysInMonth(firstDay))
  const days = eachDayOfInterval({ start: firstDay, end: lastDay })
  const startOffset = (getDay(firstDay) + 6) % 7
  const padded = [...Array(startOffset).fill(null), ...days]
  const weeks = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const colorForCar = (carId) => {
    const idx = cars.findIndex(c => c.id === carId)
    return CAR_COLORS[idx % CAR_COLORS.length]
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((day, di) => {
            if (!day) return <div key={di} className="min-h-20 rounded bg-gray-50 opacity-30" />
            const dayStr = format(day, 'yyyy-MM-dd')
            const isToday = dayStr === todayStr
            const overlapping = cars.flatMap(car =>
              car.contracts
                .filter(c => isWithinInterval(day, { start: parseISO(c.startDate), end: parseISO(c.endDate) }))
                .map(c => ({ ...c, carLabel: `${car.brand} ${car.model}`, carId: car.id }))
            )
            return (
              <div key={di} className={`min-h-20 rounded p-1 border ${isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'}`}>
                <p className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-700' : 'text-gray-500'}`}>{format(day, 'd')}</p>
                <div className="space-y-0.5">
                  {overlapping.slice(0, 3).map((c, i) => (
                    <div key={i} className={`${colorForCar(c.carId)} text-white text-xs rounded px-1 truncate`}
                      title={`${c.carLabel} · ${c.clientName}`}>
                      {c.carLabel}
                    </div>
                  ))}
                  {overlapping.length > 3 && <div className="text-xs text-gray-400">+{overlapping.length - 3}</div>}
                </div>
              </div>
            )
          })}
        </div>
      ))}
      {cars.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {cars.map((car, i) => (
            <div key={car.id} className="flex items-center gap-1 text-xs text-gray-600">
              <div className={`w-3 h-3 rounded ${CAR_COLORS[i % CAR_COLORS.length]}`} />
              {car.brand} {car.model} {car.finalPlate ? `(${car.finalPlate})` : ''}
              {car.isPartner && car.ownerAgency && <span className="text-purple-500">· {car.ownerAgency.name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Availability View ────────────────────────────────────────────────────────
function AvailabilityView({ cars, year, month }) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month - 1, getDaysInMonth(firstDay))
  const days = eachDayOfInterval({ start: firstDay, end: lastDay })
  const startOffset = (getDay(firstDay) + 6) % 7
  const padded = [...Array(startOffset).fill(null), ...days]
  const weeks = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const total = cars.length

  const getAvailability = (day) => {
    if (!day) return null
    const booked = cars.filter(car => isBooked(car, day)).length
    const available = total - booked
    return { available, booked, total }
  }

  const cellColor = (av) => {
    if (!av || av.total === 0) return 'bg-gray-100 text-gray-400'
    if (av.available === 0) return 'bg-red-100 border-red-300 text-red-700'
    if (av.available === av.total) return 'bg-green-100 border-green-300 text-green-700'
    return 'bg-orange-50 border-orange-200 text-orange-700'
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((day, di) => {
            if (!day) return <div key={di} className="h-20 rounded bg-gray-50 opacity-30" />
            const dayStr = format(day, 'yyyy-MM-dd')
            const isToday = dayStr === todayStr
            const av = getAvailability(day)
            return (
              <div key={di}
                className={`h-20 rounded p-2 border flex flex-col justify-between
                  ${isToday ? 'ring-2 ring-blue-400' : ''}
                  ${cellColor(av)}`}>
                <p className="text-xs font-semibold">{format(day, 'd')}</p>
                {av && av.total > 0 && (
                  <div className="text-center">
                    <p className="text-lg font-bold leading-none">{av.available}</p>
                    <p className="text-xs opacity-70">/ {av.total} dispo</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-green-100 border border-green-300 inline-block" /> Toutes disponibles</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-orange-50 border border-orange-200 inline-block" /> Partiellement disponibles</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-100 border border-red-300 inline-block" /> Toutes réservées</span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { agencyId } = useParams()
  const [current, setCurrent] = useState(new Date())
  const [view, setView] = useState('gantt')
  const [selectedCarId, setSelectedCarId] = useState('')
  const [includePartners, setIncludePartners] = useState(false)
  const [search, setSearch] = useState('')

  const year = current.getFullYear()
  const month = current.getMonth() + 1
  const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy', { locale: fr })

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', agencyId, year, month, includePartners],
    queryFn: () => getCarsCalendar(agencyId, { year, month, includePartners: includePartners ? 'true' : 'false' }).then(r => r.data),
  })

  const filteredCars = useMemo(() => {
    if (!data) return []
    let cars = data.cars
    if (selectedCarId) cars = cars.filter(c => c.id === selectedCarId)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      cars = cars.filter(c =>
        c.brand.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        (c.finalPlate || '').toLowerCase().includes(q) ||
        (c.wwPlate || '').toLowerCase().includes(q)
      )
    }
    return cars
  }, [data, selectedCarId, search])

  const views = [
    { id: 'gantt', label: 'Gantt' },
    { id: 'monthly', label: 'Mensuel' },
    { id: 'availability', label: 'Disponibilité' },
  ]

  return (
    <div className="space-y-4">
      {/* Controls row 1: navigation + view tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(d => subMonths(d, 1))} className="p-1.5 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="text-base font-semibold capitalize w-40 text-center">{monthLabel}</h2>
          <button onClick={() => setCurrent(d => addMonths(d, 1))} className="p-1.5 hover:bg-gray-100 rounded">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <button onClick={() => setCurrent(new Date())} className="text-xs text-blue-600 hover:underline ml-1">
            Aujourd'hui
          </button>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {views.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors
                ${view === v.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls row 2: car selector + search + partner toggle */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Voiture :</label>
          <select
            className="input py-1 text-sm max-w-xs"
            value={selectedCarId}
            onChange={e => setSelectedCarId(e.target.value)}
          >
            <option value="">Toutes les voitures</option>
            {data?.cars.map(car => (
              <option key={car.id} value={car.id}>
                {car.brand} {car.model} {car.finalPlate ? `(${car.finalPlate})` : car.wwPlate ? `(${car.wwPlate})` : ''}
                {car.isPartner && car.ownerAgency ? ` — ${car.ownerAgency.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Marque, modèle ou plaque..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedCarId('') }}
            className="input py-1 text-sm pl-8 w-52"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includePartners}
            onChange={e => { setIncludePartners(e.target.checked); setSelectedCarId('') }}
            className="w-4 h-4 accent-purple-600"
          />
          <span className="text-sm text-gray-700">Inclure voitures des partenaires</span>
          <Building2 className="w-4 h-4 text-purple-400" />
        </label>
      </div>

      {isLoading && <p className="text-center py-14 text-gray-400">Chargement...</p>}

      {!isLoading && data && (
        <div className="card overflow-hidden">
          {view === 'gantt' && <GanttView cars={filteredCars} year={year} month={month} />}
          {view === 'monthly' && <MonthlyView cars={filteredCars} year={year} month={month} />}
          {view === 'availability' && <AvailabilityView cars={filteredCars} year={year} month={month} />}
        </div>
      )}
    </div>
  )
}
