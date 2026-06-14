import { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCar,
  getCarDocuments, uploadCarDocument, deleteCarDocument,
  getCarUnavailabilities, createCarUnavailability, deleteCarUnavailability,
  getOilChanges, createOilChange, updateOilChange, deleteOilChange,
  getTires, createTire, updateTire, deleteTire,
  getRepairs, createRepair, updateRepair, deleteRepair, uploadRepairPhotos,
  getSinistres, createSinistre, updateSinistre, deleteSinistre, uploadSinistrePhotos, deleteSinistrePhoto,
  getFileUrl,
} from '../../api'
import Modal from '../../components/Modal'
import QRCode from 'react-qr-code'
import {
  ArrowLeft, Edit2, QrCode, Car, AlertTriangle, Wrench, FileText, BanIcon, CalendarPlus,
  Plus, Trash2, Upload, Eye, ExternalLink, CheckCircle2, Clock, Activity,
  DollarSign, Calendar, Camera, X, CheckCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'

function Lightbox({ urls, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx)
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>
      {idx > 0 && (
        <button
          className="absolute left-3 text-white p-2 hover:bg-white/20 rounded-full"
          onClick={(e) => { e.stopPropagation(); setIdx(i => i - 1) }}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      <img
        src={urls[idx]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      {idx < urls.length - 1 && (
        <button
          className="absolute right-3 text-white p-2 hover:bg-white/20 rounded-full"
          onClick={(e) => { e.stopPropagation(); setIdx(i => i + 1) }}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
      <div className="absolute bottom-4 text-white text-sm opacity-60">{idx + 1} / {urls.length}</div>
    </div>
  )
}
const fmtMoney = (n) => n != null ? `${Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD` : '-'
const isExpired = (d) => d && new Date(d) < new Date()
const isExpiringSoon = (d) => {
  if (!d) return false
  const diff = new Date(d) - new Date()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

const STATUSES = { AVAILABLE: 'Disponible', RENTED: 'En location', MAINTENANCE: 'Maintenance', INACTIVE: 'Inactif' }
const STATUS_BADGES = { AVAILABLE: 'badge-green', RENTED: 'badge-yellow', MAINTENANCE: 'badge-red', INACTIVE: 'badge-gray' }
const DISPLAY_STATUSES = { DISPONIBLE: 'Disponible', EN_ATTENTE_LIVRAISON: 'En attente de livraison', LOUE: 'Loué', ENTRETIEN: 'Entretien', HORS_SERVICE: 'Hors service' }
const DISPLAY_STATUS_BADGES = { DISPONIBLE: 'badge-green', EN_ATTENTE_LIVRAISON: 'badge-orange', LOUE: 'badge-yellow', ENTRETIEN: 'badge-blue', HORS_SERVICE: 'badge-gray' }
const CONTRACT_STATUS = { PENDING: 'En attente', RESERVATION: 'Réservation', RESERVATION_CONFIRMED: 'Réservation confirmée', ACTIVE: 'En cours', COMPLETED: 'Terminé', CANCELLED: 'Annulé' }
const CONTRACT_STATUS_BADGE = { PENDING: 'badge-yellow', RESERVATION: 'badge-purple', RESERVATION_CONFIRMED: 'badge-teal', ACTIVE: 'badge-green', COMPLETED: 'badge-blue', CANCELLED: 'badge-red' }
const FUEL_TYPES = ['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL']
const TRANSMISSIONS = ['Manuelle', 'Automatique']
const DOC_TYPES = [
  { value: 'CARTE_GRISE', label: 'Carte Grise' },
  { value: 'INSURANCE', label: 'Assurance' },
  { value: 'VIGNETTE', label: 'Vignette' },
  { value: 'CIRCULATION_AUTH', label: 'Autorisation de circulation' },
  { value: 'TECHNICAL_INSPECTION', label: 'Contrôle technique' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'OTHER', label: 'Autre' },
]
const DEADLINE_ITEMS = [
  { key: 'insuranceExpiry', label: "Fin d'assurance" },
  { key: 'nextTechnicalInspection', label: 'Prochain contrôle technique' },
  { key: 'circulationAuthExpiry', label: 'Fin autorisation de circulation' },
]


// ─── Informations tab ─────────────────────────────────────────────────────────
function InfoTab({ car }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { label: 'Immatriculation WW', value: car.wwPlate },
        { label: 'Immatriculation finale', value: car.finalPlate },
        { label: 'Marque / Modèle', value: `${car.brand} ${car.model}` },
        { label: 'Année', value: car.year },
        { label: 'Couleur', value: car.color },
        { label: 'Carburant', value: car.fuelType },
        { label: 'Boîte de vitesses', value: car.transmission },
        { label: 'Kilométrage', value: car.mileage != null ? `${car.mileage.toLocaleString()} km` : null },
        { label: 'Prix de location TTC', value: car.rentalPriceTTC != null ? `${fmtMoney(car.rentalPriceTTC)} / jour` : null },
        { label: "Prix d'achat TTC", value: car.purchasePrice != null ? fmtMoney(car.purchasePrice) : null },
        { label: "Date d'achat", value: fmtDate(car.purchaseDate) },
        { label: "Date d'autorisation", value: fmtDate(car.authorizationDate) },
        { label: 'Dernier CT', value: fmtDate(car.lastTechnicalInspection) },
        { label: 'Prochain CT', value: fmtDate(car.nextTechnicalInspection) },
        { label: 'Fin assurance', value: fmtDate(car.insuranceExpiry) },
        { label: 'Fin autorisation circulation', value: fmtDate(car.circulationAuthExpiry) },
      ].map(({ label, value }) => (
        <div key={label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="font-medium text-gray-800">{value || '-'}</p>
        </div>
      ))}
      {car.notes && (
        <div className="sm:col-span-2 lg:col-span-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="font-medium text-gray-800 whitespace-pre-wrap">{car.notes}</p>
        </div>
      )}
    </div>
  )
}

// ─── Shared contract row ─────────────────────────────────────────────────────
function ContractRow({ c }) {
  return (
    <div key={c.id} className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-300 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-800">{c.clientName}</p>
          <span className="text-xs text-gray-400">#{c.contractNumber}</span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</p>
      </div>
      <div className="text-right shrink-0">
        <span className={CONTRACT_STATUS_BADGE[c.status] || 'badge-gray'}>{CONTRACT_STATUS[c.status] || c.status}</span>
        <p className="text-sm font-medium text-gray-700 mt-1">{fmtMoney(c.montantTTC ?? c.rentalAmount)}</p>
      </div>
    </div>
  )
}

// ─── Locations tab ────────────────────────────────────────────────────────────
function LocationsTab({ car }) {
  const [view, setView] = useState('active')
  const active = car.activeRental ? [car.activeRental] : []
  const completed = car.completedRentals || []

  const tabs = [
    { id: 'active', label: `En cours (${active.length})` },
    { id: 'completed', label: `Terminées (${completed.length})` },
  ]

  const current = view === 'active' ? active : completed

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${view === t.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {current.map(c => <ContractRow key={c.id} c={c} />)}
        {!current.length && (
          <div className="text-center py-10 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune location</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Réservations tab ─────────────────────────────────────────────────────────
function ReservationsTab({ car }) {
  const reservations = car.upcomingReservations || []
  return (
    <div className="space-y-2">
      {reservations.map(c => <ContractRow key={c.id} c={c} />)}
      {!reservations.length && (
        <div className="text-center py-10 text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune réservation en attente</p>
        </div>
      )}
    </div>
  )
}

// ─── Disponibilité tab ────────────────────────────────────────────────────────
function DisponibiliteTab({ agencyId, car }) {
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({ startDate: today, endDate: '', reason: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: items = [] } = useQuery({
    queryKey: ['unavailabilities', car.id],
    queryFn: () => getCarUnavailabilities(agencyId, car.id).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data) => createCarUnavailability(agencyId, car.id, data),
    onSuccess: () => { qc.invalidateQueries(['unavailabilities', car.id]); setForm({ startDate: today, endDate: '', reason: '' }); toast.success('Indisponibilité ajoutée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => deleteCarUnavailability(agencyId, car.id, id),
    onSuccess: () => { qc.invalidateQueries(['unavailabilities', car.id]); toast.success('Supprimé') },
  })

  return (
    <div className="space-y-6">
      {car.activeRental && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <Activity className="w-4 h-4 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700">Location en cours jusqu'au <strong>{fmtDate(car.activeRental.endDate)}</strong> — {car.activeRental.clientName}</p>
        </div>
      )}
      <div>
        <h4 className="font-medium text-gray-700 mb-3">Ajouter une indisponibilité</h4>
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div><label className="label text-xs">Date début *</label><input className="input" type="date" value={form.startDate} onChange={set('startDate')} required /></div>
          <div><label className="label text-xs">Date fin *</label><input className="input" type="date" value={form.endDate} min={form.startDate} onChange={set('endDate')} required /></div>
          <div><label className="label text-xs">Raison</label><input className="input" placeholder="Réparation, associé..." value={form.reason} onChange={set('reason')} /></div>
          <div className="sm:col-span-3 flex justify-end">
            <button type="submit" className="btn-primary flex items-center gap-2 w-full sm:w-fit justify-center" disabled={createMut.isPending}>
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </form>
      </div>
      <div>
        <h4 className="font-medium text-gray-700 mb-3">Périodes d'indisponibilité ({items.length})</h4>
        <div className="space-y-2">
          {items.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <div>
                <p className="font-medium text-sm">{fmtDate(u.startDate)} → {fmtDate(u.endDate)}</p>
                {u.reason && <p className="text-xs text-gray-500 mt-0.5">{u.reason}</p>}
              </div>
              <button onClick={() => deleteMut.mutate(u.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!items.length && <p className="text-sm text-gray-400 text-center py-6">Aucune indisponibilité enregistrée</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Documents tab ────────────────────────────────────────────────────────────
function DocumentsTab({ agencyId, carId }) {
  const qc = useQueryClient()
  const [file, setFile] = useState(null)
  const [docType, setDocType] = useState('PHOTO')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data: docs = [] } = useQuery({
    queryKey: ['carDocs', carId],
    queryFn: () => getCarDocuments(agencyId, carId).then(r => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (docId) => deleteCarDocument(agencyId, carId, docId),
    onSuccess: () => { qc.invalidateQueries(['carDocs', carId]); toast.success('Document supprimé') },
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
      await uploadCarDocument(agencyId, carId, fd)
      qc.invalidateQueries(['carDocs', carId])
      setFile(null); setNotes(''); e.target.reset()
      toast.success('Document ajouté')
    } catch { toast.error("Erreur lors de l'upload") }
    finally { setUploading(false) }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleUpload} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <h4 className="font-medium text-sm text-gray-700">Ajouter un document</h4>
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
        <button type="submit" className="btn-primary flex items-center gap-2 w-full sm:w-fit justify-center" disabled={uploading}>
          <Upload className="w-4 h-4" /> {uploading ? 'Upload...' : 'Ajouter'}
        </button>
      </form>

      {docs.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Type', 'Fichier', 'Date', 'Notes', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="badge-blue">{DOC_TYPES.find(t => t.value === d.type)?.label || d.type}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{d.filename}</td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmtDate(d.createdAt)}</td>
                  <td className="py-3 px-4 text-gray-400">{d.notes || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                      <a href={getFileUrl(d.url, agencyId)} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Ouvrir">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(d.id) }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun document</p>
        </div>
      )}
    </div>
  )
}

// ─── Échéances tab ────────────────────────────────────────────────────────────
function EcheancesTab({ car }) {
  const items = DEADLINE_ITEMS.map(({ key, label }) => ({
    label,
    value: car[key],
    expired: isExpired(car[key]),
    soon: isExpiringSoon(car[key]),
  }))

  return (
    <div className="space-y-3">
      {items.map(({ label, value, expired, soon }) => (
        <div key={label} className={`flex items-center justify-between rounded-xl px-4 py-3.5 border ${expired ? 'bg-red-50 border-red-200' : soon ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-3">
            {expired
              ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              : soon
                ? <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                : <CheckCircle2 className="w-4 h-4 text-gray-300 shrink-0" />}
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
          <span className={`text-sm font-semibold ${expired ? 'text-red-600' : soon ? 'text-orange-600' : value ? 'text-gray-700' : 'text-gray-400'}`}>
            {value ? fmtDate(value) : 'Non renseigné'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Entretien tab (oil, tires, repairs) ──────────────────────────────────────
function EntretienTab({ agencyId, carId }) {
  const [sub, setSub] = useState('oil')
  const qc = useQueryClient()

  // Oil changes
  const { data: oilChanges = [] } = useQuery({
    queryKey: ['oilChanges', agencyId, carId],
    queryFn: () => getOilChanges(agencyId, { carId }).then(r => r.data),
  })
  const [oilModal, setOilModal] = useState(null)
  const [oilForm, setOilForm] = useState({ date: '', mileage: '', oilType: '', filterChanged: false, cost: '', notes: '', nextKm: '', nextDate: '' })
  const setOil = (k) => (e) => setOilForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const createOilMut = useMutation({
    mutationFn: (d) => createOilChange(agencyId, { ...d, carId }),
    onSuccess: () => { qc.invalidateQueries(['oilChanges', agencyId, carId]); setOilModal(null); toast.success('Vidange ajoutée') },
  })
  const updateOilMut = useMutation({
    mutationFn: ({ id, data }) => updateOilChange(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['oilChanges', agencyId, carId]); setOilModal(null); toast.success('Mis à jour') },
  })
  const deleteOilMut = useMutation({
    mutationFn: (id) => deleteOilChange(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['oilChanges', agencyId, carId]); toast.success('Supprimé') },
  })

  // Tires
  const { data: tires = [] } = useQuery({
    queryKey: ['tires', agencyId, carId],
    queryFn: () => getTires(agencyId, { carId }).then(r => r.data),
  })
  const [tireModal, setTireModal] = useState(null)
  const [tireForm, setTireForm] = useState({ date: '', mileage: '', position: '', brand: '', size: '', cost: '', notes: '' })
  const setTire = (k) => (e) => setTireForm(f => ({ ...f, [k]: e.target.value }))
  const POSITIONS = ['AV-GAUCHE', 'AV-DROIT', 'AR-GAUCHE', 'AR-DROIT', 'ROUE-DE-SECOURS', 'TOUS']
  const createTireMut = useMutation({
    mutationFn: (d) => createTire(agencyId, { ...d, carId }),
    onSuccess: () => { qc.invalidateQueries(['tires', agencyId, carId]); setTireModal(null); toast.success('Ajouté') },
  })
  const updateTireMut = useMutation({
    mutationFn: ({ id, data }) => updateTire(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['tires', agencyId, carId]); setTireModal(null); toast.success('Mis à jour') },
  })
  const deleteTireMut = useMutation({
    mutationFn: (id) => deleteTire(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['tires', agencyId, carId]); toast.success('Supprimé') },
  })

  // Repairs
  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', agencyId, carId],
    queryFn: () => getRepairs(agencyId, { carId }).then(r => r.data),
  })
  const [repairModal, setRepairModal] = useState(null)
  const [repairForm, setRepairForm] = useState({ date: '', description: '', mileage: '', cost: '', garage: '', nextRepairDate: '', nextRepairDescription: '', notes: '' })
  const [photoFiles, setPhotoFiles] = useState([])
  const setRepair = (k) => (e) => setRepairForm(f => ({ ...f, [k]: e.target.value }))
  const createRepairMut = useMutation({
    mutationFn: async (d) => {
      const r = await createRepair(agencyId, { ...d, carId })
      if (photoFiles.length > 0) {
        const fd = new FormData()
        photoFiles.forEach(f => fd.append('photos', f))
        await uploadRepairPhotos(agencyId, r.data.id, fd)
      }
    },
    onSuccess: () => { qc.invalidateQueries(['repairs', agencyId, carId]); setRepairModal(null); toast.success('Réparation ajoutée') },
  })
  const updateRepairMut = useMutation({
    mutationFn: ({ id, data }) => updateRepair(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['repairs', agencyId, carId]); setRepairModal(null); toast.success('Mis à jour') },
  })
  const deleteRepairMut = useMutation({
    mutationFn: (id) => deleteRepair(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['repairs', agencyId, carId]); toast.success('Supprimé') },
  })

  const total = oilChanges.length + tires.length + repairs.length

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'oil', label: `Vidanges (${oilChanges.length})` },
          { id: 'tires', label: `Pneus (${tires.length})` },
          { id: 'repairs', label: `Réparations (${repairs.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${sub === t.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OIL CHANGES */}
      {sub === 'oil' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setOilForm({ date: '', mileage: '', oilType: '', filterChanged: false, cost: '', notes: '', nextKm: '', nextDate: '' }); setOilModal({ record: null }) }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouvelle Vidange
            </button>
          </div>
          {oilChanges.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Date', 'Km', 'Huile', 'Filtre', 'Coût', 'Prochaine', ''].map(h => <th key={h} className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs uppercase">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {oilChanges.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="py-3 px-4">{r.mileage?.toLocaleString() || '-'}</td>
                      <td className="py-3 px-4 text-gray-500">{r.oilType || '-'}</td>
                      <td className="py-3 px-4">{r.filterChanged ? '✓' : '✗'}</td>
                      <td className="py-3 px-4">{r.cost ? `${r.cost} MAD` : '-'}</td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{r.nextDate ? fmtDate(r.nextDate) : r.nextKm ? `${r.nextKm?.toLocaleString()} km` : '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => { setOilForm({ ...r, date: r.date?.split('T')[0], nextDate: r.nextDate?.split('T')[0] || '' }); setOilModal({ record: r }) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                          <button onClick={() => { if (confirm('Supprimer ?')) deleteOilMut.mutate(r.id) }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon={Wrench} text="Aucune vidange enregistrée" />}
        </div>
      )}

      {/* TIRES */}
      {sub === 'tires' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setTireForm({ date: '', mileage: '', position: '', brand: '', size: '', cost: '', notes: '' }); setTireModal({ record: null }) }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouveau Pneu
            </button>
          </div>
          {tires.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Date', 'Position', 'Marque', 'Taille', 'Coût TTC', ''].map(h => <th key={h} className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs uppercase">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {tires.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="py-3 px-4 text-gray-500">{r.position || '-'}</td>
                      <td className="py-3 px-4 text-gray-500">{r.brand || '-'}</td>
                      <td className="py-3 px-4 text-gray-500">{r.size || '-'}</td>
                      <td className="py-3 px-4">{r.cost ? `${r.cost} MAD` : '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => { setTireForm({ ...r, date: r.date?.split('T')[0] }); setTireModal({ record: r }) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                          <button onClick={() => { if (confirm('Supprimer ?')) deleteTireMut.mutate(r.id) }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon={Wrench} text="Aucun enregistrement pneu" />}
        </div>
      )}

      {/* REPAIRS */}
      {sub === 'repairs' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setRepairForm({ date: '', description: '', mileage: '', cost: '', garage: '', nextRepairDate: '', nextRepairDescription: '', notes: '' }); setPhotoFiles([]); setRepairModal({ record: null }) }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouvelle Réparation
            </button>
          </div>
          <div className="space-y-3">
            {repairs.map(r => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p className="font-medium">{r.description}</p>
                      <span className="text-xs text-gray-400">{fmtDate(r.date)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                      {r.mileage && <span>{r.mileage.toLocaleString()} km</span>}
                      {r.cost && <span>{r.cost} MAD</span>}
                      {r.garage && <span>Garage : {r.garage}</span>}
                    </div>
                    {r.nextRepairDate && (
                      <p className="text-xs text-orange-600 mt-1">Prochaine : {r.nextRepairDescription} — {fmtDate(r.nextRepairDate)}</p>
                    )}
                    {r.photos?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {r.photos.map(p => <img key={p.id} src={getFileUrl(p.url, agencyId)} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setRepairForm({ ...r, date: r.date?.split('T')[0], nextRepairDate: r.nextRepairDate?.split('T')[0] || '' }); setRepairModal({ record: r }) }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteRepairMut.mutate(r.id) }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              </div>
            ))}
            {!repairs.length && <EmptyState icon={Wrench} text="Aucune réparation enregistrée" />}
          </div>
        </div>
      )}

      {/* MODALS */}
      <Modal isOpen={!!oilModal} onClose={() => setOilModal(null)} title={oilModal?.record ? 'Modifier Vidange' : 'Nouvelle Vidange'}>
        <form onSubmit={(e) => { e.preventDefault(); oilModal?.record ? updateOilMut.mutate({ id: oilModal.record.id, data: oilForm }) : createOilMut.mutate(oilForm) }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date *</label><input className="input" type="date" value={oilForm.date} onChange={setOil('date')} required /></div>
            <div><label className="label">Kilométrage *</label><input className="input" type="number" value={oilForm.mileage} onChange={setOil('mileage')} required /></div>
            <div><label className="label">Type d'huile</label><input className="input" value={oilForm.oilType} onChange={setOil('oilType')} /></div>
            <div><label className="label">Coût (MAD)</label><input className="input" type="number" value={oilForm.cost} onChange={setOil('cost')} /></div>
            <div><label className="label">Prochain km</label><input className="input" type="number" value={oilForm.nextKm} onChange={setOil('nextKm')} /></div>
            <div><label className="label">Prochaine date</label><input className="input" type="date" value={oilForm.nextDate} onChange={setOil('nextDate')} /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={oilForm.filterChanged} onChange={setOil('filterChanged')} /><span className="text-sm">Filtre changé</span></label>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={oilForm.notes} onChange={setOil('notes')} /></div>
          <div className="flex justify-end"><button type="submit" className="btn-primary w-full sm:w-fit justify-center">Enregistrer</button></div>
        </form>
      </Modal>

      <Modal isOpen={!!tireModal} onClose={() => setTireModal(null)} title={tireModal?.record ? 'Modifier Pneu' : 'Nouveau Pneu'}>
        <form onSubmit={(e) => { e.preventDefault(); tireModal?.record ? updateTireMut.mutate({ id: tireModal.record.id, data: tireForm }) : createTireMut.mutate(tireForm) }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date *</label><input className="input" type="date" value={tireForm.date} onChange={setTire('date')} required /></div>
            <div><label className="label">Kilométrage</label><input className="input" type="number" value={tireForm.mileage} onChange={setTire('mileage')} /></div>
            <div><label className="label">Position</label><select className="input" value={tireForm.position} onChange={setTire('position')}><option value="">--</option>{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="label">Marque pneu</label><input className="input" value={tireForm.brand} onChange={setTire('brand')} /></div>
            <div><label className="label">Taille</label><input className="input" placeholder="Ex: 205/55R16" value={tireForm.size} onChange={setTire('size')} /></div>
            <div><label className="label">Coût TTC</label><input className="input" type="number" value={tireForm.cost} onChange={setTire('cost')} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={tireForm.notes} onChange={setTire('notes')} /></div>
          <div className="flex justify-end"><button type="submit" className="btn-primary w-full sm:w-fit justify-center">Enregistrer</button></div>
        </form>
      </Modal>

      <Modal isOpen={!!repairModal} onClose={() => setRepairModal(null)} title={repairModal?.record ? 'Modifier Réparation' : 'Nouvelle Réparation'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); repairModal?.record ? updateRepairMut.mutate({ id: repairModal.record.id, data: repairForm }) : createRepairMut.mutate(repairForm) }} className="space-y-4">
          <div><label className="label">Description *</label><input className="input" value={repairForm.description} onChange={setRepair('description')} required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date *</label><input className="input" type="date" value={repairForm.date} onChange={setRepair('date')} required /></div>
            <div><label className="label">Kilométrage</label><input className="input" type="number" value={repairForm.mileage} onChange={setRepair('mileage')} /></div>
            <div><label className="label">Coût (MAD)</label><input className="input" type="number" value={repairForm.cost} onChange={setRepair('cost')} /></div>
            <div><label className="label">Garage</label><input className="input" value={repairForm.garage} onChange={setRepair('garage')} /></div>
            <div><label className="label">Prochaine réparation</label><input className="input" value={repairForm.nextRepairDescription} onChange={setRepair('nextRepairDescription')} /></div>
            <div><label className="label">Date prochaine</label><input className="input" type="date" value={repairForm.nextRepairDate} onChange={setRepair('nextRepairDate')} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={repairForm.notes} onChange={setRepair('notes')} /></div>
          {!repairModal?.record && (
            <div><label className="label">Photos (optionnel)</label><input type="file" multiple accept="image/*" className="input" onChange={e => setPhotoFiles(Array.from(e.target.files))} /></div>
          )}
          <div className="flex justify-end"><button type="submit" className="btn-primary w-full sm:w-fit justify-center">Enregistrer</button></div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Sinistres tab ─────────────────────────────────────────────────────────────
function SinistresTab({ agencyId, car }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', collectedAmount: '', collectionDate: '', status: 'OPEN' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: sinistres = [] } = useQuery({
    queryKey: ['sinistres', agencyId, car.id],
    queryFn: () => getSinistres(agencyId, { carId: car.id }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d) => createSinistre(agencyId, { ...d, carId: car.id }),
    onSuccess: () => { qc.invalidateQueries(['sinistres', agencyId, car.id]); setModal(null); toast.success('Sinistre ajouté') },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateSinistre(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['sinistres', agencyId, car.id]); setModal(null); toast.success('Mis à jour') },
  })
  const deleteMut = useMutation({
    mutationFn: (id) => deleteSinistre(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['sinistres', agencyId, car.id]); toast.success('Supprimé') },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setForm({ title: '', description: '', collectedAmount: '', collectionDate: '', status: 'OPEN' }); setModal({ record: null }) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau Sinistre
        </button>
      </div>
      <div className="space-y-3">
        {sinistres.map(s => (
          <div key={s.id} className={`border rounded-xl p-4 ${s.status === 'RESOLVED' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {s.status === 'RESOLVED'
                    ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />}
                  <p className="font-medium">{s.title || 'Sans titre'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {s.status === 'RESOLVED' ? 'Résolu' : 'Ouvert'}
                  </span>
                </div>
                {s.description && <p className="text-sm text-gray-600 mt-1">{s.description}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                  {s.collectedAmount != null && <span>Montant perçu : {fmtMoney(s.collectedAmount)}</span>}
                  {s.collectionDate && <span>Le {fmtDate(s.collectionDate)}</span>}
                  <span>Créé le {fmtDate(s.createdAt)}</span>
                </div>
                {s.photos?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {s.photos.map(p => <img key={p.id} src={getFileUrl(p.url, agencyId)} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />)}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setForm({ title: s.title || '', description: s.description || '', collectedAmount: s.collectedAmount != null ? String(s.collectedAmount) : '', collectionDate: s.collectionDate?.split('T')[0] || '', status: s.status }); setModal({ record: s }) }} className="p-1.5 hover:bg-white rounded-lg"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(s.id) }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
          </div>
        ))}
        {!sinistres.length && <EmptyState icon={AlertTriangle} text="Aucun sinistre enregistré" />}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.record ? 'Modifier Sinistre' : 'Nouveau Sinistre'}>
        <form onSubmit={(e) => { e.preventDefault(); modal?.record ? updateMut.mutate({ id: modal.record.id, data: form }) : createMut.mutate(form) }} className="space-y-4">
          <div><label className="label">Titre</label><input className="input" value={form.title} onChange={set('title')} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={set('description')} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Montant perçu (MAD)</label><input className="input" type="number" step="0.01" value={form.collectedAmount} onChange={set('collectedAmount')} /></div>
            <div><label className="label">Date de perception</label><input className="input" type="date" value={form.collectionDate} onChange={set('collectionDate')} /></div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="OPEN">Ouvert</option>
                <option value="RESOLVED">Résolu</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end"><button type="submit" className="btn-primary w-full sm:w-fit justify-center">Enregistrer</button></div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Shared empty state ────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <Icon className="w-10 h-10 mx-auto mb-2 opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconClass, label, shortLabel, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-2.5 sm:p-4 flex items-start gap-2 sm:gap-3">
      <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 truncate uppercase tracking-wide">
          <span className="sm:hidden">{shortLabel || label}</span>
          <span className="hidden sm:inline">{label}</span>
        </p>
        <p className="text-base sm:text-xl font-bold text-gray-800 truncate">{value}</p>
        {sub && <p className="hidden sm:block text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
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
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 300, 340)
      ctx.drawImage(img, 25, 10, 250, 250)
      ctx.fillStyle = '#111827'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(label, 150, 285)
      const a = document.createElement('a')
      a.download = `qr-${car.finalPlate || car.id}.png`
      a.href = canvas.toDataURL('image/png'); a.click()
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CarDetail() {
  const { agencyId, carId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState('info')
  const [qrModal, setQrModal] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)

  const { data: car, isLoading } = useQuery({
    queryKey: ['carDetail', agencyId, carId],
    queryFn: () => getCar(agencyId, carId).then(r => r.data),
  })

  const { data: oilChanges = [] } = useQuery({
    queryKey: ['oilChanges', agencyId, carId],
    queryFn: () => getOilChanges(agencyId, { carId }).then(r => r.data),
    enabled: !!car,
  })
  const { data: tires = [] } = useQuery({
    queryKey: ['tires', agencyId, carId],
    queryFn: () => getTires(agencyId, { carId }).then(r => r.data),
    enabled: !!car,
  })
  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', agencyId, carId],
    queryFn: () => getRepairs(agencyId, { carId }).then(r => r.data),
    enabled: !!car,
  })
  const { data: sinistres = [] } = useQuery({
    queryKey: ['sinistres', agencyId, carId],
    queryFn: () => getSinistres(agencyId, { carId }).then(r => r.data),
    enabled: !!car,
  })
  const { data: docs = [] } = useQuery({
    queryKey: ['carDocs', carId],
    queryFn: () => getCarDocuments(agencyId, carId).then(r => r.data),
    enabled: !!car,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  )

  if (!car) return (
    <div className="text-center py-20 text-gray-400">
      <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>Véhicule introuvable</p>
    </div>
  )

  const allContracts = [...(car.completedRentals || []), ...(car.upcomingReservations || []), ...(car.activeRental ? [car.activeRental] : [])]

  const totalRevenue = [...(car.completedRentals || []), ...(car.activeRental ? [car.activeRental] : [])]
    .filter(c => c.status !== 'CANCELLED')
    .reduce((s, c) => s + (c.montantTTC ?? c.rentalAmount ?? 0), 0)
  const totalEntretienCost = [...oilChanges, ...tires, ...repairs].reduce((s, r) => s + (Number(r.cost) || 0), 0)
  const nextDeadline = DEADLINE_ITEMS
    .map(({ key }) => car[key])
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => d > new Date())
    .sort((a, b) => a - b)[0]

  const carPhotos = docs.filter(d => d.type === 'PHOTO')
  const photoUrls = carPhotos.map(p => getFileUrl(p.url, agencyId))

  const activeAndCompleted = [...(car.activeRental ? [car.activeRental] : []), ...(car.completedRentals || [])]
  const reservations = car.upcomingReservations || []

  const TABS = [
    { id: 'info',          short: 'Infos',   label: 'Informations' },
    { id: 'locations',     short: `Loc. (${activeAndCompleted.length})`,   label: `Locations (${activeAndCompleted.length})` },
    { id: 'reservations',  short: `Rés. (${reservations.length})`,         label: `Réservations (${reservations.length})` },
    { id: 'disponibilite', short: 'Dispo',   label: 'Disponibilité' },
    { id: 'documents',     short: `Docs (${docs.length})`,                 label: `Documents (${docs.length})` },
    { id: 'echeances',     short: `Éch. (${DEADLINE_ITEMS.filter(({ key }) => car[key]).length})`, label: `Échéances (${DEADLINE_ITEMS.filter(({ key }) => car[key]).length})` },
    { id: 'entretien',     short: `Entr. (${oilChanges.length + tires.length + repairs.length})`,  label: `Entretien (${oilChanges.length + tires.length + repairs.length})` },
    { id: 'sinistres',     short: `Sin. (${sinistres.length})`,            label: `Sinistres (${sinistres.length})` },
  ]

  const statusBadge = DISPLAY_STATUS_BADGES[car.displayStatus] || STATUS_BADGES[car.status]
  const statusLabel = DISPLAY_STATUSES[car.displayStatus] || STATUSES[car.status]

  return (
    <div className="space-y-6">
      {lightboxIdx !== null && (
        <Lightbox urls={photoUrls} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {/* Breadcrumb */}
      <Link to={`/agency/${agencyId}/cars`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour au parc
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{car.brand} {car.model}</h1>
                <span className={statusBadge}>{statusLabel}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                {car.finalPlate && <span className="font-mono font-medium text-gray-700">{car.finalPlate}</span>}
                {car.wwPlate && !car.finalPlate && <span className="font-mono text-gray-500">{car.wwPlate}</span>}
                {car.year && <span>{car.year}</span>}
                {car.mileage != null && <span>{car.mileage.toLocaleString()} km</span>}
                {car.fuelType && <span>{car.fuelType}</span>}
                {car.transmission && <span>{car.transmission}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button onClick={() => setQrModal(true)} className="btn-secondary flex items-center gap-1.5 text-sm" title="QR Code">
              <QrCode className="w-4 h-4" /> <span className="hidden sm:inline">QR Code</span>
            </button>
            <button
              onClick={() => navigate(`/agency/${agencyId}/contracts/new?carId=${carId}`)}
              className="btn-secondary flex items-center gap-1.5 text-sm text-green-700 border-green-200 hover:bg-green-50"
            >
              <CalendarPlus className="w-4 h-4" /> <span className="hidden sm:inline">Réserver</span>
            </button>
            <button onClick={() => navigate(`/agency/${agencyId}/cars/${carId}/edit`)} className="btn-primary flex items-center gap-1.5 text-sm">
              <Edit2 className="w-4 h-4" /> Modifier
            </button>
          </div>
        </div>

        {/* Photo strip */}
        {carPhotos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {carPhotos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxIdx(idx)}
                  className={`relative shrink-0 rounded-xl overflow-hidden border-2 transition-opacity hover:opacity-90 ${photo.isMainPhoto ? 'border-yellow-400' : 'border-transparent'}`}
                  style={{ width: 112, height: 80 }}
                >
                  <img src={photoUrls[idx]} alt="" className="w-full h-full object-cover" />
                  {photo.isMainPhoto && (
                    <span className="absolute bottom-0 left-0 right-0 bg-yellow-400/80 text-white text-[9px] text-center py-0.5 font-medium">Principale</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-5 border-t border-gray-100">
          <StatCard
            icon={Activity}
            iconClass="bg-blue-50 text-blue-600"
            label="LOCATIONS"
            shortLabel="LOCATIONS"
            value={allContracts.length}
            sub={car.activeRental ? '1 en cours' : 'Aucune en cours'}
          />
          <StatCard
            icon={DollarSign}
            iconClass="bg-green-50 text-green-600"
            label="REVENUS GÉNÉRÉS"
            shortLabel="REVENUS"
            value={totalRevenue > 0 ? `${totalRevenue.toLocaleString('fr-MA', { maximumFractionDigits: 0 })}` : '0'}
            sub="MAD (locations non annulées)"
          />
          <StatCard
            icon={Wrench}
            iconClass="bg-orange-50 text-orange-600"
            label="COÛT ENTRETIEN"
            shortLabel="ENTRETIEN"
            value={totalEntretienCost > 0 ? `${totalEntretienCost.toLocaleString('fr-MA', { maximumFractionDigits: 0 })}` : '0'}
            sub={`${oilChanges.length + tires.length + repairs.length} intervention(s)`}
          />
          <StatCard
            icon={Calendar}
            iconClass={nextDeadline ? (isExpiringSoon(nextDeadline) ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-purple-600') : 'bg-gray-50 text-gray-400'}
            label="PROCHAINE ÉCHÉANCE"
            shortLabel="ÉCHÉANCE"
            value={nextDeadline ? fmtDate(nextDeadline) : '—'}
            sub={`${DEADLINE_ITEMS.filter(({ key }) => car[key]).length} échéance(s)`}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex gap-0 overflow-x-auto border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 sm:px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${tab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50/40' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {tab === 'info' && <InfoTab car={car} />}
          {tab === 'locations' && <LocationsTab car={car} />}
          {tab === 'reservations' && <ReservationsTab car={car} />}
          {tab === 'disponibilite' && <DisponibiliteTab agencyId={agencyId} car={car} />}
          {tab === 'documents' && <DocumentsTab agencyId={agencyId} carId={carId} />}
          {tab === 'echeances' && <EcheancesTab car={car} />}
          {tab === 'entretien' && <EntretienTab agencyId={agencyId} carId={carId} />}
          {tab === 'sinistres' && <SinistresTab agencyId={agencyId} car={car} />}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={qrModal} onClose={() => setQrModal(false)} title={`QR Code — ${car.brand} ${car.model}`}>
        <QRModal car={car} onClose={() => setQrModal(false)} />
      </Modal>
    </div>
  )
}
