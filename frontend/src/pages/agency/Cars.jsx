import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCars, getCar, createCar, updateCar, deleteCar, uploadCarDocument, getCarDocuments, deleteCarDocument, getCarUnavailabilities, createCarUnavailability, deleteCarUnavailability, getCarAvailability, checkAvailability, getFileUrl } from '../../api'
import Modal from '../../components/Modal'
import SinistresModal from './Sinistres'
import QRScanner from '../../components/QRScanner'
import QRCode from 'react-qr-code'
import { Plus, Edit2, Trash2, FileText, Upload, Car, AlertTriangle, QrCode, ScanLine, BanIcon, Wrench, Share2, Search, Building2, Info, CheckCircle2, Clock, Eye, List, Rows3, ExternalLink } from 'lucide-react'
import MaintenanceContent from './Maintenance'
import ExternalCarsContent from './ExternalCars'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'
const isExpired = (d) => d && new Date(d) < new Date()
const isExpiringSoon = (d) => {
  if (!d) return false
  const diff = new Date(d) - new Date()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

const STATUSES = { AVAILABLE: 'Disponible', RENTED: 'En location', MAINTENANCE: 'Maintenance', INACTIVE: 'Inactif' }
const STATUS_BADGES = { AVAILABLE: 'badge-green', RENTED: 'badge-yellow', MAINTENANCE: 'badge-red', INACTIVE: 'badge-gray' }

const DISPLAY_STATUSES = {
  DISPONIBLE: 'Disponible',
  EN_ATTENTE_LIVRAISON: 'En attente de livraison',
  LOUE: 'Loué',
  ENTRETIEN: 'Entretien',
  HORS_SERVICE: 'Hors service',
}
const DISPLAY_STATUS_BADGES = {
  DISPONIBLE: 'badge-green',
  EN_ATTENTE_LIVRAISON: 'badge-orange',
  LOUE: 'badge-yellow',
  ENTRETIEN: 'badge-blue',
  HORS_SERVICE: 'badge-gray',
}
const FUEL_TYPES = ['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL']
const TRANSMISSIONS = ['Manuelle', 'Automatique']
const CONTRACT_STATUS = { PENDING: 'En attente', RESERVATION: 'Réservation', RESERVATION_CONFIRMED: 'Réservation confirmée', ACTIVE: 'En cours', COMPLETED: 'Terminé', CANCELLED: 'Annulé' }
const CONTRACT_STATUS_BADGE = { PENDING: 'badge-yellow', RESERVATION: 'badge-purple', RESERVATION_CONFIRMED: 'badge-teal', ACTIVE: 'badge-green', COMPLETED: 'badge-blue', CANCELLED: 'badge-red' }
const DOC_TYPES = [
  { value: 'CARTE_GRISE', label: 'Carte Grise' },
  { value: 'INSURANCE', label: 'Assurance' },
  { value: 'VIGNETTE', label: 'Vignette' },
  { value: 'CIRCULATION_AUTH', label: 'Autorisation de circulation' },
  { value: 'TECHNICAL_INSPECTION', label: 'Contrôle technique' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'OTHER', label: 'Autre' },
]

function CarForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(initial || {
    wwPlate: '', finalPlate: '', brand: '', model: '', year: '', color: '', fuelType: '',
    mileage: '', authorizationDate: '', lastTechnicalInspection: '', nextTechnicalInspection: '',
    insuranceExpiry: '', circulationAuthExpiry: '', notes: '', purchasePrice: '', purchaseDate: '',
    rentalPriceTTC: '', transmission: '',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Immatriculation WW</label><input className="input" value={form.wwPlate} onChange={set('wwPlate')} placeholder="1234-WW-5" /></div>
        <div><label className="label">Immatriculation finale</label><input className="input" value={form.finalPlate} onChange={set('finalPlate')} placeholder="12345-A-1" /></div>
        <div><label className="label">Marque *</label><input className="input" value={form.brand} onChange={set('brand')} required /></div>
        <div><label className="label">Modèle *</label><input className="input" value={form.model} onChange={set('model')} required /></div>
        <div><label className="label">Année</label><input className="input" type="number" value={form.year} onChange={set('year')} /></div>
        <div><label className="label">Couleur</label><input className="input" value={form.color} onChange={set('color')} /></div>
        <div>
          <label className="label">Carburant</label>
          <select className="input" value={form.fuelType} onChange={set('fuelType')}>
            <option value="">--</option>
            {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div><label className="label">Kilométrage</label><input className="input" type="number" value={form.mileage} onChange={set('mileage')} /></div>
        <div>
          <label className="label">Boîte de vitesses</label>
          <select className="input" value={form.transmission} onChange={set('transmission')}>
            <option value="">--</option>
            {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="label">Prix indicatif/jour TTC (MAD)</label><input className="input" type="number" step="0.01" value={form.rentalPriceTTC} onChange={set('rentalPriceTTC')} placeholder="0.00" /></div>
      </div>
      <h4 className="font-medium text-gray-700 pt-2">Achat</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Prix d'achat TTC (MAD)</label><input className="input" type="number" step="0.01" value={form.purchasePrice} onChange={set('purchasePrice')} placeholder="0.00" /></div>
        <div><label className="label">Date d'achat</label><input className="input" type="date" value={form.purchaseDate} onChange={set('purchaseDate')} /></div>
      </div>
      <h4 className="font-medium text-gray-700 pt-2">Documents & Dates</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Date d'autorisation</label><input className="input" type="date" value={form.authorizationDate} onChange={set('authorizationDate')} /></div>
        <div><label className="label">Fin assurance</label><input className="input" type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} /></div>
        <div><label className="label">Dernier CT</label><input className="input" type="date" value={form.lastTechnicalInspection} onChange={set('lastTechnicalInspection')} /></div>
        <div><label className="label">Prochain CT</label><input className="input" type="date" value={form.nextTechnicalInspection} onChange={set('nextTechnicalInspection')} /></div>
        <div><label className="label">Fin autorisation circulation</label><input className="input" type="date" value={form.circulationAuthExpiry} onChange={set('circulationAuthExpiry')} /></div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary w-full sm:w-fit justify-center" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}

function DocumentsModal({ agencyId, car }) {
  const qc = useQueryClient()
  const [file, setFile] = useState(null)
  const [docType, setDocType] = useState('PHOTO')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data: docs = [] } = useQuery({
    queryKey: ['carDocs', car.id],
    queryFn: () => getCarDocuments(agencyId, car.id).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (docId) => deleteCarDocument(agencyId, car.id, docId),
    onSuccess: () => { qc.invalidateQueries(['carDocs', car.id]); toast.success('Document supprimé') },
  })

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return toast.error('Sélectionnez un fichier')
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', docType)
    fd.append('notes', notes)
    try {
      await uploadCarDocument(agencyId, car.id, fd)
      qc.invalidateQueries(['carDocs', car.id])
      setFile(null); setNotes(''); e.target.reset()
      toast.success('Document ajouté')
    } catch {
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleUpload} className="border rounded-lg p-4 space-y-3 bg-gray-50">
        <h4 className="font-medium text-sm">Ajouter un document</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Type de document</label>
            <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Fichier (PDF, image)</label>
            <input type="file" className="input text-xs" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={e => setFile(e.target.files[0])} required />
          </div>
        </div>
        <div><label className="label text-xs">Notes</label><input className="input" value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <button type="submit" className="btn-primary text-xs py-1.5 flex items-center justify-center gap-1 w-full sm:w-fit" disabled={uploading}>
          <Upload className="w-3 h-3" /> {uploading ? 'Upload...' : 'Ajouter'}
        </button>
      </form>

      <div className="space-y-2">
        {docs.map(doc => (
          <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white border rounded-lg px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{DOC_TYPES.find(t => t.value === doc.type)?.label || doc.type}</p>
              <p className="text-xs text-gray-500 truncate">{doc.filename}</p>
              {doc.notes && <p className="text-xs text-gray-400 truncate">{doc.notes}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <a href={getFileUrl(doc.url, agencyId)} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1">Voir</a>
              <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(doc.id) }} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {!docs.length && <p className="text-sm text-gray-400 text-center py-4">Aucun document</p>}
      </div>
    </div>
  )
}

function QRModal({ car, onClose }) {
  const qrRef = useRef(null)
  const qrValue = `rental:car:${car.id}`
  const label = `${car.brand} ${car.model} — ${car.finalPlate || car.wwPlate || car.id}`

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 300; canvas.height = 340
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 300, 340)
      ctx.drawImage(img, 25, 10, 250, 250)
      ctx.fillStyle = '#111827'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, 150, 285)
      const a = document.createElement('a')
      a.download = `qr-${car.finalPlate || car.id}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div ref={qrRef} className="p-4 bg-white border border-gray-200 rounded-xl">
        <QRCode value={qrValue} size={220} />
      </div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400 font-mono">{qrValue}</p>
      <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
        <QrCode className="w-4 h-4" /> Télécharger PNG
      </button>
    </div>
  )
}

function UnavailabilityModal({ agencyId, car }) {
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({ startDate: today, endDate: '', reason: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: items = [] } = useQuery({
    queryKey: ['unavailabilities', car.id],
    queryFn: () => getCarUnavailabilities(agencyId, car.id).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => createCarUnavailability(agencyId, car.id, data),
    onSuccess: () => { qc.invalidateQueries(['unavailabilities', car.id]); setForm({ startDate: today, endDate: '', reason: '' }); toast.success('Indisponibilité ajoutée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCarUnavailability(agencyId, car.id, id),
    onSuccess: () => { qc.invalidateQueries(['unavailabilities', car.id]); toast.success('Supprimé') },
  })

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="label text-xs">Date début *</label>
          <input className="input py-1.5 text-sm" type="date" value={form.startDate} onChange={set('startDate')} required />
        </div>
        <div>
          <label className="label text-xs">Date fin *</label>
          <input className="input py-1.5 text-sm" type="date" value={form.endDate} min={form.startDate} onChange={set('endDate')} required />
        </div>
        <div>
          <label className="label text-xs">Raison</label>
          <input className="input py-1.5 text-sm" placeholder="Réparation, associé..." value={form.reason} onChange={set('reason')} />
        </div>
        <div className="sm:col-span-3 flex justify-end">
          <button type="submit" className="btn-primary text-sm py-1.5 justify-center w-full sm:w-fit" disabled={createMutation.isPending}>
            <Plus className="w-3.5 h-3.5 inline mr-1" /> Ajouter
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucune indisponibilité</p>}
        {items.map(u => (
          <div key={u.id} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium">
                {format(new Date(u.startDate), 'dd/MM/yyyy', { locale: fr })} → {format(new Date(u.endDate), 'dd/MM/yyyy', { locale: fr })}
              </p>
              {u.reason && <p className="text-xs text-gray-500">{u.reason}</p>}
            </div>
            <button onClick={() => deleteMutation.mutate(u.id)} className="p-1 text-red-400 hover:bg-red-50 rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const fmtMoney = (n) => n != null ? `${Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD` : '-'

const DEADLINE_ITEMS = [
  { key: 'insuranceExpiry', label: 'Fin d\'assurance' },
  { key: 'nextTechnicalInspection', label: 'Prochain contrôle technique' },
  { key: 'circulationAuthExpiry', label: 'Fin autorisation de circulation' },
]

function CarDetailModal({ agencyId, carId }) {
  const [tab, setTab] = useState('details')
  const [docView, setDocView] = useState('simple')
  const [docTypeFilter, setDocTypeFilter] = useState('')

  const { data: car, isLoading } = useQuery({
    queryKey: ['carDetail', agencyId, carId],
    queryFn: () => getCar(agencyId, carId).then(r => r.data),
    enabled: !!carId,
  })

  if (isLoading || !car) return <div className="text-center py-8 text-gray-400">Chargement...</div>

  const tabs = [
    { key: 'details', label: 'Détails', icon: Info },
    { key: 'completed', label: 'Locations terminées', icon: CheckCircle2 },
    { key: 'upcoming', label: 'Prochaines réservations', icon: Clock },
    { key: 'availability', label: 'Disponibilités', icon: BanIcon },
    { key: 'maintenance', label: 'Entretiens', icon: Wrench },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'deadlines', label: 'Échéances', icon: AlertTriangle },
  ]

  const renderContractRow = (c) => (
    <div key={c.id} className="flex items-start justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{c.clientName} <span className="text-xs text-gray-400">— {c.contractNumber}</span></p>
        <p className="text-xs text-gray-500">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</p>
      </div>
      <div className="text-right shrink-0">
        <span className={CONTRACT_STATUS_BADGE[c.status] || 'badge-gray'}>{CONTRACT_STATUS[c.status] || c.status}</span>
        <p className="text-xs text-gray-500 mt-1">{fmtMoney(c.montantTTC ?? c.rentalAmount)}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto bg-gray-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${tab === t.key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><span className="text-gray-500">Marque / Modèle</span><p className="font-medium">{car.brand} {car.model}</p></div>
          <div><span className="text-gray-500">Année</span><p className="font-medium">{car.year || '-'}</p></div>
          <div><span className="text-gray-500">Immatriculation WW</span><p className="font-medium">{car.wwPlate || '-'}</p></div>
          <div><span className="text-gray-500">Immatriculation finale</span><p className="font-medium">{car.finalPlate || '-'}</p></div>
          <div><span className="text-gray-500">Couleur</span><p className="font-medium">{car.color || '-'}</p></div>
          <div><span className="text-gray-500">Carburant</span><p className="font-medium">{car.fuelType || '-'}</p></div>
          <div><span className="text-gray-500">Boîte de vitesses</span><p className="font-medium">{car.transmission || '-'}</p></div>
          <div><span className="text-gray-500">Kilométrage</span><p className="font-medium">{car.mileage != null ? `${car.mileage.toLocaleString()} km` : '-'}</p></div>
          <div><span className="text-gray-500">Prix de location TTC</span><p className="font-medium">{car.rentalPriceTTC != null ? `${fmtMoney(car.rentalPriceTTC)} / jour` : '-'}</p></div>
          <div><span className="text-gray-500">Statut</span><p className="font-medium">{DISPLAY_STATUSES[car.displayStatus] || STATUSES[car.status]}</p></div>
          <div><span className="text-gray-500">Prix d'achat TTC</span><p className="font-medium">{car.purchasePrice != null ? fmtMoney(car.purchasePrice) : '-'}</p></div>
          <div><span className="text-gray-500">Date d'achat</span><p className="font-medium">{fmtDate(car.purchaseDate)}</p></div>
          {car.notes && <div className="col-span-2"><span className="text-gray-500">Notes</span><p className="font-medium whitespace-pre-wrap">{car.notes}</p></div>}
        </div>
      )}

      {tab === 'completed' && (
        <div className="space-y-2">
          {(!car.completedRentals || !car.completedRentals.length) && <p className="text-sm text-gray-400 text-center py-4">Aucune location terminée</p>}
          {car.completedRentals?.map(renderContractRow)}
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="space-y-2">
          {(!car.upcomingReservations || !car.upcomingReservations.length) && <p className="text-sm text-gray-400 text-center py-4">Aucune réservation à venir</p>}
          {car.upcomingReservations?.map(renderContractRow)}
        </div>
      )}

      {tab === 'availability' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={DISPLAY_STATUS_BADGES[car.displayStatus] || STATUS_BADGES[car.status]}>
              {DISPLAY_STATUSES[car.displayStatus] || STATUSES[car.status]}
            </span>
            {car.activeRental && (
              <span className="text-xs text-gray-500">Location en cours jusqu'au {fmtDate(car.activeRental.endDate)}</span>
            )}
          </div>
          <h4 className="text-sm font-medium text-gray-700">Périodes d'indisponibilité</h4>
          <div className="space-y-2">
            {(!car.unavailabilities || !car.unavailabilities.length) && <p className="text-sm text-gray-400 text-center py-4">Aucune indisponibilité enregistrée</p>}
            {car.unavailabilities?.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <p className="text-sm font-medium">{fmtDate(u.startDate)} → {fmtDate(u.endDate)}</p>
                {u.reason && <p className="text-xs text-gray-500">{u.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Vidanges récentes</h4>
            <div className="space-y-2">
              {(!car.oilChanges || !car.oilChanges.length) && <p className="text-sm text-gray-400">Aucune vidange enregistrée</p>}
              {car.oilChanges?.map(o => (
                <div key={o.id} className="flex items-start justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">{fmtDate(o.date)} — {o.mileage?.toLocaleString()} km {o.oilType ? `(${o.oilType})` : ''}</span>
                  {o.cost != null && <span className="text-gray-500 shrink-0">{fmtMoney(o.cost)}</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Réparations récentes</h4>
            <div className="space-y-2">
              {(!car.repairs || !car.repairs.length) && <p className="text-sm text-gray-400">Aucune réparation enregistrée</p>}
              {car.repairs?.map(r => (
                <div key={r.id} className="flex items-start justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">{fmtDate(r.date)} — {r.description} {r.garage ? `(${r.garage})` : ''}</span>
                  {r.cost != null && <span className="text-gray-500 shrink-0">{fmtMoney(r.cost)}</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Pneus</h4>
            <div className="space-y-2">
              {(!car.tireRecords || !car.tireRecords.length) && <p className="text-sm text-gray-400">Aucun changement de pneus enregistré</p>}
              {car.tireRecords?.map(t => (
                <div key={t.id} className="flex items-start justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">{fmtDate(t.date)} {t.position ? `— ${t.position}` : ''} {t.brand ? `(${t.brand})` : ''}</span>
                  {t.cost != null && <span className="text-gray-500 shrink-0">{fmtMoney(t.cost)}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && (() => {
        const allDocs = car.documents || []
        const filteredDocs = docTypeFilter ? allDocs.filter(d => d.type === docTypeFilter) : allDocs
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <select className="input py-1.5 text-sm w-full sm:w-56" value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
                  <option value="">Tous les types de document</option>
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setDocView('simple')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${docView === 'simple' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="w-3.5 h-3.5" /> Simple
                </button>
                <button
                  onClick={() => setDocView('detailed')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${docView === 'detailed' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Rows3 className="w-3.5 h-3.5" /> Détaillé
                </button>
              </div>
            </div>

            {!filteredDocs.length && (
              <p className="text-sm text-gray-400 text-center py-4">
                {allDocs.length ? 'Aucun document pour ce type' : 'Aucun document'}
              </p>
            )}

            {!!filteredDocs.length && docView === 'simple' && (
              <div className="space-y-2">
                {filteredDocs.map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{DOC_TYPES.find(t => t.value === d.type)?.label || d.type}</p>
                      <p className="text-xs text-gray-500">{d.filename}</p>
                    </div>
                    <span className="text-xs text-gray-400">{fmtDate(d.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}

            {!!filteredDocs.length && docView === 'detailed' && (
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Type de document', 'Fichier', 'Date de création', 'Notes', ''].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-medium text-gray-600 text-xs uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(d => (
                      <tr key={d.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <span className="badge-blue">{DOC_TYPES.find(t => t.value === d.type)?.label || d.type}</span>
                        </td>
                        <td className="py-2 px-3 text-gray-600">{d.filename}</td>
                        <td className="py-2 px-3 text-gray-500">
                          {d.createdAt ? format(new Date(d.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : '-'}
                        </td>
                        <td className="py-2 px-3 text-gray-500">{d.notes || '-'}</td>
                        <td className="py-2 px-3 text-right">
                          <a href={getFileUrl(d.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <ExternalLink className="w-3.5 h-3.5" /> Ouvrir
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {tab === 'deadlines' && (
        <div className="space-y-2">
          {DEADLINE_ITEMS.map(({ key, label }) => {
            const val = car[key]
            const expired = isExpired(val)
            const soon = isExpiringSoon(val)
            return (
              <div key={key} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${expired ? 'bg-red-50 border-red-200' : soon ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                <span className="text-sm">{label}</span>
                <span className={`text-sm font-medium ${expired ? 'text-red-600' : soon ? 'text-orange-600' : 'text-gray-700'}`}>
                  {fmtDate(val)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AvailabilitySearch({ agencyId }) {
  const navigate = useNavigate()
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
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-gray-700">Recherche de disponibilité</h3>
      </div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
        <div>
          <label className="label text-xs">Date début</label>
          <input className="input py-1.5 text-sm" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Date fin</label>
          <input className="input py-1.5 text-sm" type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer sm:pb-1">
          <input type="checkbox" className="rounded" checked={includePartners} onChange={e => setIncludePartners(e.target.checked)} />
          <Building2 className="w-3.5 h-3.5 text-purple-500" /> Partenaires
        </label>
        <button className="btn-primary py-1.5 text-sm flex items-center justify-center gap-2 w-full sm:w-fit" onClick={handleSearch} disabled={!startDate || !endDate || isLoading}>
          <Search className="w-3.5 h-3.5" /> Chercher
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Recherche en cours...</p>}

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
                  <div key={c.id} className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 text-xs px-2.5 py-1 rounded-full font-medium">
                    <Car className="w-3 h-3" />
                    {c.brand} {c.model}
                    {(c.finalPlate || c.wwPlate) && <span className="text-green-600 font-normal">· {c.finalPlate || c.wwPlate}</span>}
                    <button
                      onClick={() => navigate(`/agency/${agencyId}/contracts?carId=${c.id}&startDate=${startDate}&endDate=${endDate}`)}
                      className="ml-1 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full hover:bg-green-700 transition-colors font-medium"
                    >
                      Réserver
                    </button>
                  </div>
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

export default function Cars() {
  const { agencyId } = useParams()
  const qc = useQueryClient()
  const [mainTab, setMainTab] = useState('cars')
  const [modal, setModal] = useState(null)
  const [docsModal, setDocsModal] = useState(null)
  const [qrModal, setQrModal] = useState(null)
  const [unavailModal, setUnavailModal] = useState(null)
  const [sinistresModal, setSinistresModal] = useState(null)
  const [detailModal, setDetailModal] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ['cars', agencyId],
    queryFn: () => getCars(agencyId).then(r => r.data),
  })

  const handleQRScan = (text) => {
    const match = text.match(/^rental:car:(.+)$/)
    if (match) {
      setSearch(match[1])
    } else {
      setSearch(text)
    }
  }

  const createMutation = useMutation({
    mutationFn: (data) => createCar(agencyId, data),
    onSuccess: () => { qc.invalidateQueries(['cars', agencyId]); setModal(null); toast.success('Véhicule ajouté') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ carId, data }) => updateCar(agencyId, carId, data),
    onSuccess: () => { qc.invalidateQueries(['cars', agencyId]); setModal(null); toast.success('Mis à jour') },
    onError: () => toast.error('Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (carId) => deleteCar(agencyId, carId),
    onSuccess: () => { qc.invalidateQueries(['cars', agencyId]); toast.success('Véhicule désactivé') },
    onError: () => toast.error('Erreur'),
  })

  const filtered = cars.filter(car =>
    !search ||
    `${car.brand} ${car.model} ${car.finalPlate || ''} ${car.wwPlate || ''} ${car.id}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        <button onClick={() => setMainTab('cars')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${mainTab === 'cars' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          <Car className="w-4 h-4" /> Véhicules
        </button>
        <button onClick={() => setMainTab('partners')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${mainTab === 'partners' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          <Share2 className="w-4 h-4" /> Partenaires
        </button>
        <button onClick={() => setMainTab('maintenance')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${mainTab === 'maintenance' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          <Wrench className="w-4 h-4" /> Maintenance
        </button>
      </div>

      {mainTab === 'maintenance' && <MaintenanceContent />}
      {mainTab === 'partners' && <ExternalCarsContent />}

      {mainTab === 'cars' && <>
      <AvailabilitySearch agencyId={agencyId} />
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <input
              className="input pl-3 w-full"
              placeholder="Rechercher (marque, plaque, ID)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setScannerOpen(true)} className="btn-secondary flex items-center gap-1.5 px-3 shrink-0" title="Scanner QR code">
            <ScanLine className="w-4 h-4" /> <span className="hidden sm:inline">Scanner QR</span>
          </button>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <p className="text-sm text-gray-500 whitespace-nowrap">{filtered.length} véhicule(s)</p>
          <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Nouveau Véhicule
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading && <div className="text-center py-8 text-gray-400">Chargement...</div>}
        {filtered.map(car => {
          const hasInsuranceAlert = isExpired(car.insuranceExpiry) || isExpiringSoon(car.insuranceExpiry)
          const hasTechAlert = isExpired(car.nextTechnicalInspection) || isExpiringSoon(car.nextTechnicalInspection)
          const hasAlert = hasInsuranceAlert || hasTechAlert

          return (
            <div key={car.id} className={`card p-4 ${hasAlert ? 'border-orange-200' : ''}`}>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <Link to={`/agency/${agencyId}/cars/${car.id}`} className="flex gap-4 flex-1 min-w-0 group">
                  <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden bg-gray-100 group-hover:bg-blue-50 transition-colors flex items-center justify-center border border-gray-200">
                    {car.mainPhotoUrl ? (
                      <img
                        src={getFileUrl(car.mainPhotoUrl, agencyId)}
                        alt={`${car.brand} ${car.model}`}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <span className={`w-full h-full items-center justify-center ${car.mainPhotoUrl ? 'hidden' : 'flex'}`}>
                      <Car className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold group-hover:text-blue-600 transition-colors">{car.brand} {car.model}</span>
                      <span className={DISPLAY_STATUS_BADGES[car.displayStatus] || STATUS_BADGES[car.status]}>
                        {DISPLAY_STATUSES[car.displayStatus] || STATUSES[car.status]}
                      </span>
                      {hasAlert && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                    </div>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {car.wwPlate && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">WW: {car.wwPlate}</span>}
                      {car.finalPlate && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{car.finalPlate}</span>}
                      {car.year && <span className="text-xs text-gray-500">{car.year}</span>}
                      {car.fuelType && <span className="text-xs text-gray-500">{car.fuelType}</span>}
                      {car.transmission && <span className="text-xs text-gray-500">{car.transmission}</span>}
                      {car.mileage && <span className="text-xs text-gray-500">{car.mileage.toLocaleString()} km</span>}
                      {car.rentalPriceTTC != null && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                          {car.rentalPriceTTC.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD/jour TTC
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      {car.insuranceExpiry && (
                        <span className={isExpired(car.insuranceExpiry) ? 'text-red-600 font-medium' : isExpiringSoon(car.insuranceExpiry) ? 'text-orange-600' : ''}>
                          Assurance: {fmtDate(car.insuranceExpiry)}
                        </span>
                      )}
                      {car.nextTechnicalInspection && (
                        <span className={isExpired(car.nextTechnicalInspection) ? 'text-red-600 font-medium' : isExpiringSoon(car.nextTechnicalInspection) ? 'text-orange-600' : ''}>
                          CT: {fmtDate(car.nextTechnicalInspection)}
                        </span>
                      )}
                      {car.purchaseDate && <span>Achat: {fmtDate(car.purchaseDate)}</span>}
                      {car.purchasePrice != null && (
                        <span className="font-medium text-gray-700">
                          {car.purchasePrice.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD TTC
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 lg:pt-0 lg:border-0 lg:justify-end">
                  <Link to={`/agency/${agencyId}/cars/${car.id}`} className="btn-secondary text-xs py-1.5 flex items-center gap-1" title="Voir les détails">
                    <Eye className="w-3 h-3 text-blue-500" /> Détails
                  </Link>
                  <button onClick={() => setDocsModal(car)} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Documents
                  </button>
                  <button onClick={() => setUnavailModal(car)} className="btn-secondary text-xs py-1.5 flex items-center gap-1" title="Indisponibilités">
                    <BanIcon className="w-3 h-3 text-orange-500" /> <span className="hidden sm:inline">Indisponibilités</span><span className="sm:hidden">Indispo.</span>
                  </button>
                  <button onClick={() => setSinistresModal(car)} className="btn-secondary text-xs py-1.5 flex items-center gap-1" title="Sinistres">
                    <AlertTriangle className="w-3 h-3 text-red-500" /> Sinistres
                  </button>
                  <button onClick={() => setQrModal(car)} className="p-2 hover:bg-gray-100 rounded-lg" title="QR Code">
                    <QrCode className="w-4 h-4 text-purple-500" />
                  </button>
                  <button onClick={() => setModal({ type: 'edit', car })} className="p-2 hover:bg-gray-100 rounded-lg" title="Modifier">
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button onClick={() => { if (confirm('Désactiver ce véhicule ?')) deleteMutation.mutate(car.id) }} className="p-2 hover:bg-red-50 rounded-lg" title="Désactiver">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {!isLoading && !cars.length && (
          <div className="text-center py-12 text-gray-400">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun véhicule. Ajoutez le premier !</p>
          </div>
        )}
      </div>

      </>}

      <Modal isOpen={modal?.type === 'create'} onClose={() => setModal(null)} title="Nouveau Véhicule" size="lg">
        <CarForm onSubmit={createMutation.mutate} loading={createMutation.isPending} />
      </Modal>
      <Modal isOpen={modal?.type === 'edit'} onClose={() => setModal(null)} title="Modifier Véhicule" size="lg">
        {modal?.car && (
          <CarForm
            initial={{
              ...modal.car,
              authorizationDate: modal.car.authorizationDate?.split('T')[0] || '',
              lastTechnicalInspection: modal.car.lastTechnicalInspection?.split('T')[0] || '',
              nextTechnicalInspection: modal.car.nextTechnicalInspection?.split('T')[0] || '',
              insuranceExpiry: modal.car.insuranceExpiry?.split('T')[0] || '',
              circulationAuthExpiry: modal.car.circulationAuthExpiry?.split('T')[0] || '',
              purchaseDate: modal.car.purchaseDate?.split('T')[0] || '',
              purchasePrice: modal.car.purchasePrice ?? '',
              rentalPriceTTC: modal.car.rentalPriceTTC ?? '',
              transmission: modal.car.transmission || '',
            }}
            onSubmit={(data) => updateMutation.mutate({ carId: modal.car.id, data })}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
      <Modal isOpen={!!docsModal} onClose={() => setDocsModal(null)} title={`Documents — ${docsModal?.brand} ${docsModal?.model}`} size="lg">
        {docsModal && <DocumentsModal agencyId={agencyId} car={docsModal} />}
      </Modal>
      <Modal isOpen={!!qrModal} onClose={() => setQrModal(null)} title={`QR Code — ${qrModal?.brand} ${qrModal?.model}`}>
        {qrModal && <QRModal car={qrModal} onClose={() => setQrModal(null)} />}
      </Modal>
      <Modal isOpen={!!unavailModal} onClose={() => setUnavailModal(null)} title={`Indisponibilités — ${unavailModal?.brand} ${unavailModal?.model}`}>
        {unavailModal && <UnavailabilityModal agencyId={agencyId} car={unavailModal} />}
      </Modal>
      <Modal isOpen={!!sinistresModal} onClose={() => setSinistresModal(null)} title={`Sinistres — ${sinistresModal?.brand} ${sinistresModal?.model}`} size="lg">
        {sinistresModal && <SinistresModal agencyId={agencyId} car={sinistresModal} allCars={cars} />}
      </Modal>
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`${detailModal?.brand} ${detailModal?.model} ${detailModal?.finalPlate ? `— ${detailModal.finalPlate}` : ''}`} size="xl">
        {detailModal && <CarDetailModal agencyId={agencyId} carId={detailModal.id} />}
      </Modal>
      <QRScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onResult={handleQRScan} />
    </div>
  )
}
