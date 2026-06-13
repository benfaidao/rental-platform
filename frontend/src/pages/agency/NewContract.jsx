import { useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCars, createContract, getClients, getAgencyMembers,
} from '../../api'
import QRScanner from '../../components/QRScanner'
import {
  ArrowLeft, Check, User, Car, Shield, Settings, CreditCard, FileCheck,
  ScanLine, UserCheck, Building2, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'
const fmtMoney = (n, cur = 'MAD') => n != null && n !== '' ? `${Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} ${cur}` : '-'

const CURRENCIES = ['MAD', 'EUR', 'USD']
const RENTAL_TYPES = { STANDARD: 'Standard', PERIODIC: 'Périodique' }
const PERIOD_UNITS = { WEEK: 'Semaine', MONTH: 'Mois' }
const INTERVAL_TYPES = { CLOSED: 'Fermé (date fixe)', OPEN: 'Ouvert (date estimée)' }

const STEPS = [
  { id: 'client',   label: 'Client',              icon: User },
  { id: 'vehicle',  label: 'Véhicule',             icon: Car },
  { id: 'caution',  label: 'Cautions',             icon: Shield },
  { id: 'options',  label: 'Options & Remise',     icon: Settings },
  { id: 'payment',  label: 'Paiement',             icon: CreditCard },
  { id: 'recap',    label: 'Récapitulatif',         icon: FileCheck },
]

// ─── Reusable sub-components ──────────────────────────────────────────────────

function ClientSearch({ agencyId, onSelect }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', agencyId, search],
    queryFn: () => getClients(agencyId, search ? { search } : {}).then(r => r.data),
    enabled: search.length >= 2,
  })
  return (
    <div className="relative">
      <label className="label flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-blue-500" /> Rechercher un client existant</label>
      <input
        className="input"
        placeholder="Nom, téléphone, N° pièce d'identité..."
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && clients.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {clients.map(c => (
            <button key={c.id} type="button"
              className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
              onClick={() => { onSelect(c); setSearch(`${c.firstName} ${c.lastName}`); setOpen(false) }}
            >
              <p className="font-medium text-gray-800">{c.firstName} {c.lastName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{[c.phone, c.idNumber].filter(Boolean).join(' · ')}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CollectedByInput({ agencyId, value, onChange }) {
  const { data: members = [] } = useQuery({
    queryKey: ['agencyMembers', agencyId],
    queryFn: () => getAgencyMembers(agencyId).then(r => r.data),
  })
  const memberNames = members.map(m => `${m.user.firstName} ${m.user.lastName}`)
  const [mode, setMode] = useState(!!value && !memberNames.includes(value) ? 'other' : 'member')
  return (
    <div>
      {mode === 'member' ? (
        <select className="input" value={memberNames.includes(value) ? value : ''}
          onChange={e => { if (e.target.value === '__other__') { setMode('other'); onChange('') } else onChange(e.target.value) }}>
          <option value="">-- Choisir un membre --</option>
          {members.map(m => <option key={m.id} value={`${m.user.firstName} ${m.user.lastName}`}>{m.user.firstName} {m.user.lastName}</option>)}
          <option value="__other__">Autre personne...</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input className="input flex-1" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Nom de la personne" />
          <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => { setMode('member'); onChange('') }}>Membre</button>
        </div>
      )}
    </div>
  )
}

function RecapRow({ label, value, highlight }) {
  if (!value && value !== 0) return null
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0 ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-right ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewContract() {
  const { agencyId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  const [step, setStep] = useState(0)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [carSearch, setCarSearch] = useState('')
  const [hasSecondDriver, setHasSecondDriver] = useState(false)

  const prefillCarId = searchParams.get('carId') || ''
  const prefillStart = searchParams.get('startDate') || ''
  const prefillEnd = searchParams.get('endDate') || ''

  const [form, setForm] = useState({
    // Client
    clientId: '', clientType: 'INDIVIDUAL', clientName: '', clientPhone: '',
    clientEmail: '', clientIdNumber: '', clientIdExpiry: '', clientAddress: '',
    clientLicenseNumber: '', clientLicenseExpiry: '',
    secondDriverName: '', secondDriverIdNumber: '', secondDriverIdExpiry: '',
    secondDriverLicense: '', secondDriverLicenseExpiry: '',
    // Véhicule
    carId: prefillCarId,
    startDate: prefillStart, startTime: '', endDate: prefillEnd, endTime: '',
    pickupLocation: '', dropoffLocation: '', startMileage: '',
    // Cautions
    guaranteeAmount: '', guaranteeCheck: false,
    guaranteeCheckAmount: '', guaranteeCheckNumber: '',
    isSubRental: false, subrenterName: '',
    // Options
    rentalType: 'STANDARD', intervalType: 'CLOSED', periodUnit: 'MONTH', allowOverage: false,
    notes: '', remise: '',
    // Paiement
    prixBase: '', currency: 'MAD', amountPaid: '', collectedBy: '', collectedAt: '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const { data: cars = [] } = useQuery({
    queryKey: ['cars', agencyId],
    queryFn: () => getCars(agencyId).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data) => createContract(agencyId, data),
    onSuccess: () => {
      qc.invalidateQueries(['contracts', agencyId])
      toast.success('Contrat créé avec succès')
      navigate(`/agency/${agencyId}/contracts`)
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur lors de la création'),
  })

  const handleQRScan = (text) => {
    const match = text.match(/^rental:car:(.+)$/)
    if (!match) return
    const found = cars.find(c => c.id === match[1])
    if (found) { setForm(f => ({ ...f, carId: found.id })); setCarSearch(`${found.brand} ${found.model}`) }
  }

  const handleClientSelect = (client) => {
    setForm(f => ({
      ...f,
      clientId: client.id,
      clientType: client.clientType || 'INDIVIDUAL',
      clientName: client.clientType === 'COMPANY' && client.companyName ? client.companyName : `${client.firstName} ${client.lastName}`,
      clientPhone: client.phone || f.clientPhone,
      clientEmail: client.email || f.clientEmail,
      clientIdNumber: client.idNumber || f.clientIdNumber,
      clientIdExpiry: client.idExpiry ? client.idExpiry.split('T')[0] : f.clientIdExpiry,
      clientAddress: client.address || f.clientAddress,
      clientLicenseNumber: client.clientType === 'COMPANY' ? '' : (client.licenseNumber || f.clientLicenseNumber),
      clientLicenseExpiry: client.clientType === 'COMPANY' ? '' : (client.licenseExpiry ? client.licenseExpiry.split('T')[0] : f.clientLicenseExpiry),
    }))
  }

  const filteredCars = cars
    .filter(c => c.status === 'AVAILABLE' || c.id === form.carId)
    .filter(c => !carSearch || `${c.brand} ${c.model} ${c.finalPlate || ''} ${c.wwPlate || ''}`.toLowerCase().includes(carSearch.toLowerCase()))

  const selectedCar = cars.find(c => c.id === form.carId)

  const prixBase = parseFloat(form.prixBase) || 0
  const remise = parseFloat(form.remise) || 0
  const montantFinal = Math.max(0, prixBase - remise)
  const amountPaid = parseFloat(form.amountPaid) || 0

  const canNext = () => {
    if (step === 0) return !!form.clientName
    if (step === 1) return !!form.carId && !!form.startDate && !!form.endDate
    if (step === 4) return !!form.prixBase
    return true
  }

  const handleSubmit = () => {
    const data = {
      carId: form.carId,
      clientId: form.clientId || undefined,
      clientType: form.clientType,
      clientName: form.clientName,
      clientPhone: form.clientPhone || undefined,
      clientEmail: form.clientEmail || undefined,
      clientIdNumber: form.clientIdNumber || undefined,
      clientIdExpiry: form.clientIdExpiry || undefined,
      clientAddress: form.clientAddress || undefined,
      clientLicenseNumber: form.clientLicenseNumber || undefined,
      clientLicenseExpiry: form.clientLicenseExpiry || undefined,
      secondDriverName: hasSecondDriver ? (form.secondDriverName || undefined) : undefined,
      secondDriverIdNumber: hasSecondDriver ? (form.secondDriverIdNumber || undefined) : undefined,
      secondDriverIdExpiry: hasSecondDriver ? (form.secondDriverIdExpiry || undefined) : undefined,
      secondDriverLicense: hasSecondDriver ? (form.secondDriverLicense || undefined) : undefined,
      secondDriverLicenseExpiry: hasSecondDriver ? (form.secondDriverLicenseExpiry || undefined) : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      pickupLocation: form.pickupLocation || undefined,
      dropoffLocation: form.dropoffLocation || undefined,
      startMileage: form.startMileage ? parseInt(form.startMileage) : undefined,
      guaranteeAmount: form.guaranteeAmount !== '' ? parseFloat(form.guaranteeAmount) : 0,
      guaranteeCheck: form.guaranteeCheck,
      guaranteeCheckAmount: form.guaranteeCheck && form.guaranteeCheckAmount ? parseFloat(form.guaranteeCheckAmount) : undefined,
      guaranteeCheckNumber: form.guaranteeCheck ? (form.guaranteeCheckNumber || undefined) : undefined,
      isSubRental: form.isSubRental,
      subrenterName: form.isSubRental ? (form.subrenterName || undefined) : undefined,
      rentalType: form.rentalType,
      intervalType: form.intervalType,
      periodUnit: form.rentalType === 'PERIODIC' ? form.periodUnit : undefined,
      allowOverage: form.allowOverage,
      notes: form.notes || undefined,
      rentalAmount: montantFinal,
      currency: form.currency,
      amountPaid: amountPaid,
      collectedBy: form.collectedBy || undefined,
      collectedAt: form.collectedAt || undefined,
    }
    createMut.mutate(data)
  }

  // ─── Step content ──────────────────────────────────────────────────────────

  const stepContent = [

    // STEP 0 — Client
    <div key="client" className="space-y-5">
      <ClientSearch agencyId={agencyId} onSelect={handleClientSelect} />

      {form.clientType === 'COMPANY' && (
        <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 rounded-xl px-3 py-2">
          <Building2 className="w-3.5 h-3.5 shrink-0" /> Client Entreprise — permis non obligatoire
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Nom {form.clientType === 'COMPANY' ? '(entreprise)' : 'complet'} *</label>
          <input className="input" value={form.clientName} onChange={set('clientName')} placeholder="Nom et prénom" />
        </div>
        <div><label className="label">Téléphone</label><input className="input" value={form.clientPhone} onChange={set('clientPhone')} /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={form.clientEmail} onChange={set('clientEmail')} /></div>
        <div><label className="label">CIN / Passeport</label><input className="input" value={form.clientIdNumber} onChange={set('clientIdNumber')} /></div>
        <div><label className="label">Expiration CIN / Passeport</label><input className="input" type="date" value={form.clientIdExpiry} onChange={set('clientIdExpiry')} /></div>
        {form.clientType !== 'COMPANY' && <>
          <div><label className="label">N° Permis de conduire</label><input className="input" value={form.clientLicenseNumber} onChange={set('clientLicenseNumber')} /></div>
          <div><label className="label">Expiration permis</label><input className="input" type="date" value={form.clientLicenseExpiry} onChange={set('clientLicenseExpiry')} /></div>
        </>}
        <div className="sm:col-span-2"><label className="label">Adresse</label><input className="input" value={form.clientAddress} onChange={set('clientAddress')} /></div>
      </div>

      <div className="border-t pt-4">
        <button type="button" onClick={() => setHasSecondDriver(v => !v)}
          className="flex items-center justify-between w-full py-1 text-left">
          <span className="font-medium text-gray-700">2ème conducteur</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${hasSecondDriver ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            {hasSecondDriver ? 'Actif' : 'Ajouter'}
          </span>
        </button>
        {hasSecondDriver && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
            <div className="sm:col-span-2"><label className="label text-xs">Nom complet</label><input className="input" value={form.secondDriverName} onChange={set('secondDriverName')} /></div>
            <div><label className="label text-xs">N° CIN / Passeport</label><input className="input" value={form.secondDriverIdNumber} onChange={set('secondDriverIdNumber')} /></div>
            <div><label className="label text-xs">Expiration CIN</label><input className="input" type="date" value={form.secondDriverIdExpiry} onChange={set('secondDriverIdExpiry')} /></div>
            <div><label className="label text-xs">N° Permis</label><input className="input" value={form.secondDriverLicense} onChange={set('secondDriverLicense')} /></div>
            <div><label className="label text-xs">Expiration permis</label><input className="input" type="date" value={form.secondDriverLicenseExpiry} onChange={set('secondDriverLicenseExpiry')} /></div>
          </div>
        )}
      </div>
    </div>,

    // STEP 1 — Véhicule
    <div key="vehicle" className="space-y-5">
      <div>
        <label className="label">Véhicule *</label>
        <div className="flex gap-2 mb-2">
          <input className="input flex-1" placeholder="Rechercher par marque, plaque..." value={carSearch} onChange={e => setCarSearch(e.target.value)} />
          <button type="button" onClick={() => setScannerOpen(true)} className="btn-secondary flex items-center gap-1.5 px-3 shrink-0">
            <ScanLine className="w-4 h-4" /> QR
          </button>
        </div>
        <select className="input" value={form.carId} onChange={set('carId')} size={Math.min(filteredCars.length + 1, 6)}>
          <option value="">Choisir un véhicule</option>
          {filteredCars.map(c => (
            <option key={c.id} value={c.id}>{c.brand} {c.model} — {c.finalPlate || c.wwPlate}
              {c.rentalPriceTTC ? ` (${c.rentalPriceTTC} MAD/j)` : ''}
            </option>
          ))}
        </select>
        {selectedCar && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{selectedCar.brand} {selectedCar.model} — {selectedCar.finalPlate || selectedCar.wwPlate} sélectionné</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Date départ *</label><input className="input" type="date" value={form.startDate} onChange={set('startDate')} /></div>
        <div><label className="label">Heure départ</label><input className="input" type="time" value={form.startTime} onChange={set('startTime')} /></div>
        <div><label className="label">Date retour *</label><input className="input" type="date" value={form.endDate} min={form.startDate || undefined} onChange={set('endDate')} /></div>
        <div><label className="label">Heure retour</label><input className="input" type="time" value={form.endTime} onChange={set('endTime')} /></div>
        <div><label className="label">Lieu de prise en charge</label><input className="input" placeholder="Agence, aéroport..." value={form.pickupLocation} onChange={set('pickupLocation')} /></div>
        <div><label className="label">Lieu de restitution</label><input className="input" placeholder="Agence, aéroport..." value={form.dropoffLocation} onChange={set('dropoffLocation')} /></div>
        <div><label className="label">Km départ</label><input className="input" type="number" value={form.startMileage} onChange={set('startMileage')} /></div>
      </div>
      <QRScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onResult={handleQRScan} />
    </div>,

    // STEP 2 — Cautions
    <div key="caution" className="space-y-5">
      <div>
        <label className="label">Montant de la caution ({form.currency || 'MAD'})</label>
        <input className="input sm:max-w-xs" type="number" step="0.01" min="0" value={form.guaranteeAmount} onChange={set('guaranteeAmount')} placeholder="0.00" />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" checked={form.guaranteeCheck} onChange={set('guaranteeCheck')} className="w-4 h-4 rounded" />
          <span className="text-sm font-medium group-hover:text-blue-600">Chèque de garantie</span>
        </label>
        {form.guaranteeCheck && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-7 bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div><label className="label text-xs">Montant du chèque ({form.currency || 'MAD'})</label><input className="input" type="number" step="0.01" min="0" value={form.guaranteeCheckAmount} onChange={set('guaranteeCheckAmount')} placeholder="0.00" /></div>
            <div><label className="label text-xs">N° du chèque</label><input className="input" value={form.guaranteeCheckNumber} onChange={set('guaranteeCheckNumber')} /></div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" checked={form.isSubRental} onChange={set('isSubRental')} className="w-4 h-4 rounded" />
          <span className="text-sm font-medium group-hover:text-blue-600">Sous-location</span>
        </label>
        {form.isSubRental && (
          <div className="ml-7 bg-orange-50 rounded-xl p-4 border border-orange-100">
            <label className="label text-xs">Nom du loueur</label>
            <input className="input sm:max-w-xs" value={form.subrenterName} onChange={set('subrenterName')} />
          </div>
        )}
      </div>
    </div>,

    // STEP 3 — Options & Remise
    <div key="options" className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Type de location</label>
          <select className="input" value={form.rentalType} onChange={set('rentalType')}>
            {Object.entries(RENTAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Intervalle de dates</label>
          <select className="input" value={form.intervalType} onChange={set('intervalType')}>
            {Object.entries(INTERVAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {form.rentalType === 'PERIODIC' && (
          <div>
            <label className="label">Périodicité</label>
            <select className="input" value={form.periodUnit} onChange={set('periodUnit')}>
              {Object.entries(PERIOD_UNITS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer group">
        <input type="checkbox" checked={!form.allowOverage} onChange={e => setForm(f => ({ ...f, allowOverage: !e.target.checked }))} className="w-4 h-4 rounded" />
        <span className="text-sm font-medium group-hover:text-blue-600">Dépassement de date non autorisé</span>
      </label>

      <div className="border-t pt-4">
        <label className="label">Remise (réduction sur le montant)</label>
        <div className="flex items-center gap-3 sm:max-w-xs">
          <input className="input" type="number" step="0.01" min="0" value={form.remise} onChange={set('remise')} placeholder="0.00" />
          <span className="text-sm text-gray-500 shrink-0">{form.currency || 'MAD'}</span>
        </div>
        {parseFloat(form.remise) > 0 && (
          <p className="text-xs text-blue-600 mt-1.5">Une remise de {fmtMoney(form.remise, form.currency)} sera déduite du prix de base.</p>
        )}
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} placeholder="Instructions particulières, remarques..." />
      </div>
    </div>,

    // STEP 4 — Paiement ou acompte
    <div key="payment" className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">
            {form.rentalType === 'PERIODIC'
              ? `Prix par ${form.periodUnit === 'WEEK' ? 'semaine' : 'mois'} *`
              : 'Prix de base (location) *'}
          </label>
          <input className="input" type="number" step="0.01" value={form.prixBase} onChange={set('prixBase')} placeholder="0.00" />
        </div>
        <div>
          <label className="label">Devise</label>
          <select className="input" value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {(prixBase > 0 || remise > 0) && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
          {prixBase > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Prix de base</span><span className="font-medium">{fmtMoney(prixBase, form.currency)}</span></div>}
          {remise > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Remise</span><span className="text-green-600 font-medium">- {fmtMoney(remise, form.currency)}</span></div>}
          {(prixBase > 0 || remise > 0) && (
            <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
              <span>Total location</span>
              <span className="text-blue-700">{fmtMoney(montantFinal, form.currency)}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Acompte / Montant encaissé ({form.currency})</label>
          <input className="input" type="number" step="0.01" min="0" value={form.amountPaid} onChange={set('amountPaid')} placeholder="0.00" />
        </div>
        <div>
          <label className="label">Date d'encaissement</label>
          <input className="input" type="date" value={form.collectedAt} onChange={set('collectedAt')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Encaissé par</label>
          <CollectedByInput agencyId={agencyId} value={form.collectedBy} onChange={v => setForm(f => ({ ...f, collectedBy: v }))} />
        </div>
      </div>

      {amountPaid > 0 && montantFinal > 0 && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${amountPaid >= montantFinal ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
          {amountPaid >= montantFinal
            ? `Solde réglé intégralement.`
            : `Reste à régler : ${fmtMoney(montantFinal - amountPaid, form.currency)}`}
        </div>
      )}
    </div>,

    // STEP 5 — Récapitulatif
    <div key="recap" className="space-y-6">
      <p className="text-sm text-gray-500">Vérifiez les informations avant de créer le contrat.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Client</h4>
          <RecapRow label="Nom" value={form.clientName} />
          <RecapRow label="Téléphone" value={form.clientPhone} />
          <RecapRow label="Email" value={form.clientEmail} />
          <RecapRow label="CIN / Passeport" value={form.clientIdNumber} />
          <RecapRow label="Permis" value={form.clientLicenseNumber} />
          <RecapRow label="Adresse" value={form.clientAddress} />
          {hasSecondDriver && form.secondDriverName && (
            <RecapRow label="2ème conducteur" value={form.secondDriverName} />
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Véhicule & Dates</h4>
          <RecapRow label="Véhicule" value={selectedCar ? `${selectedCar.brand} ${selectedCar.model} — ${selectedCar.finalPlate || selectedCar.wwPlate}` : ''} />
          <RecapRow label="Départ" value={form.startDate ? `${fmtDate(form.startDate)}${form.startTime ? ` à ${form.startTime}` : ''}` : ''} />
          <RecapRow label="Retour" value={form.endDate ? `${fmtDate(form.endDate)}${form.endTime ? ` à ${form.endTime}` : ''}` : ''} />
          <RecapRow label="Prise en charge" value={form.pickupLocation} />
          <RecapRow label="Restitution" value={form.dropoffLocation} />
          <RecapRow label="Km départ" value={form.startMileage ? `${form.startMileage} km` : ''} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cautions & Options</h4>
          <RecapRow label="Caution" value={form.guaranteeAmount ? fmtMoney(form.guaranteeAmount, form.currency) : '0'} />
          {form.guaranteeCheck && <RecapRow label="Chèque garantie" value={`N° ${form.guaranteeCheckNumber || '-'} — ${fmtMoney(form.guaranteeCheckAmount, form.currency)}`} />}
          {form.isSubRental && <RecapRow label="Sous-location" value={form.subrenterName || 'Oui'} />}
          <RecapRow label="Type" value={RENTAL_TYPES[form.rentalType]} />
          <RecapRow label="Intervalle" value={INTERVAL_TYPES[form.intervalType]} />
          {form.rentalType === 'PERIODIC' && <RecapRow label="Périodicité" value={PERIOD_UNITS[form.periodUnit]} />}
          <RecapRow label="Dépassement" value={form.allowOverage ? 'Autorisé' : 'Non autorisé'} />
          {form.notes && <RecapRow label="Notes" value={form.notes} />}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Paiement</h4>
          <RecapRow label="Prix de base" value={fmtMoney(prixBase, form.currency)} />
          {remise > 0 && <RecapRow label="Remise" value={`- ${fmtMoney(remise, form.currency)}`} />}
          <RecapRow label="Total location" value={fmtMoney(montantFinal, form.currency)} highlight />
          <RecapRow label="Acompte versé" value={amountPaid > 0 ? fmtMoney(amountPaid, form.currency) : '0'} />
          {amountPaid > 0 && montantFinal > amountPaid && (
            <RecapRow label="Reste à payer" value={fmtMoney(montantFinal - amountPaid, form.currency)} />
          )}
          <RecapRow label="Encaissé par" value={form.collectedBy} />
          <RecapRow label="Date encaissement" value={form.collectedAt ? fmtDate(form.collectedAt) : ''} />
        </div>
      </div>
    </div>,
  ]

  const currentStepConfig = STEPS[step]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/agency/${agencyId}/contracts`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux contrats
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">Nouveau contrat</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        {/* Sidebar steps */}
        <div className="lg:w-56 shrink-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-3 lg:sticky lg:top-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-2 mb-1">Étapes</p>
            {STEPS.map((s, i) => {
              const done = i < step
              const active = i === step
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => done && setStep(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors mb-0.5 ${
                    active ? 'bg-blue-600 text-white' :
                    done ? 'hover:bg-gray-50 text-gray-700 cursor-pointer' :
                    'text-gray-400 cursor-default'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    active ? 'bg-white/20 text-white' :
                    done ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="font-medium">{s.label}</span>
                  {done && !active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-300" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-gray-200 rounded-2xl">
            {/* Step header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <currentStepConfig.icon className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Étape {step + 1} sur {STEPS.length}</p>
                  <h2 className="font-semibold text-gray-800">{currentStepConfig.label}</h2>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Step content */}
            <div className="px-6 py-6">
              {stepContent[step]}
            </div>

            {/* Navigation footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => step === 0 ? navigate(`/agency/${agencyId}/contracts`) : setStep(s => s - 1)}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {step === 0 ? 'Annuler' : 'Précédent'}
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMut.isPending}
                  className="btn-primary flex items-center gap-2 px-6"
                >
                  <FileCheck className="w-4 h-4" />
                  {createMut.isPending ? 'Création...' : 'Créer le contrat'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
