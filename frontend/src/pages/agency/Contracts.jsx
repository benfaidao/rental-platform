import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCars, getContracts, createContract, updateContract, deleteContract, downloadContractPdf, downloadContractPdfSigned, uploadContractPhotos, uploadContractDocument, deleteContractDocument, getClients, getClient, getPeriodicPayments, createPeriodicPayment, updatePeriodicPayment, deletePeriodicPayment, getAgencyMembers, getFileUrl } from '../../api'
import Modal from '../../components/Modal'
import SinistresModal from './Sinistres'
import SignatureCanvas from '../../components/SignatureCanvas'
import { Plus, Edit2, Trash2, FileDown, Camera, Search, UserCheck, History, Filter, X, Car, ScanLine, CalendarRange, CheckCircle, Circle, ChevronDown, ChevronUp, FileSignature, Eye, Upload, AlertTriangle, PenLine, Building2 } from 'lucide-react'
import QRScanner from '../../components/QRScanner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'
const STATUS = { PENDING: 'En attente', RESERVATION: 'Réservation', RESERVATION_CONFIRMED: 'Réservation confirmée', ACTIVE: 'En cours', COMPLETED: 'Terminé', CANCELLED: 'Annulé' }
const STATUS_BADGE = { PENDING: 'badge-yellow', RESERVATION: 'badge-purple', RESERVATION_CONFIRMED: 'badge-teal', ACTIVE: 'badge-green', COMPLETED: 'badge-blue', CANCELLED: 'badge-red' }
// "En attente" n'est plus proposé comme statut sélectionnable (les contrats démarrent directement en réservation/en cours) ;
// conservé dans STATUS/STATUS_BADGE pour continuer d'afficher correctement les contrats existants.
const SELECTABLE_STATUS = Object.fromEntries(Object.entries(STATUS).filter(([k]) => k !== 'PENDING'))
const STATUS_FILTERS = ['', 'RESERVATION', 'RESERVATION_CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED']
const CURRENCIES = ['MAD', 'EUR', 'USD']
const RENTAL_TYPES = { STANDARD: 'Standard', PERIODIC: 'Périodique' }
const PERIOD_UNITS = { WEEK: 'Semaine', MONTH: 'Mois' }
const INTERVAL_TYPES = { CLOSED: 'Fermé (date fixe)', OPEN: 'Ouvert (date estimée)' }

function SignaturePdfModal({ agencyId, contract, onClose, onSigned }) {
  const clientRef  = useRef(null)
  const driver2Ref = useRef(null)
  const agencyRef  = useRef(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const signatures = {
        signatureClient:  clientRef.current?.getDataURL(),
        signatureDriver2: contract.secondDriverName ? driver2Ref.current?.getDataURL() : undefined,
        signatureAgency:  agencyRef.current?.getDataURL(),
      }
      const res = await downloadContractPdfSigned(agencyId, contract.id, signatures)

      // Téléchargement local
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `contrat-${contract.contractNumber}-signé.pdf`
      a.click()
      URL.revokeObjectURL(url)

      // Upload automatique dans les documents du contrat
      const fileName = `contrat-${contract.contractNumber}-signé.pdf`
      const file = new File([res.data], fileName, { type: 'application/pdf' })
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'SIGNED_CONTRACT')
      fd.append('notes', 'Signé en ligne')
      await uploadContractDocument(agencyId, contract.id, fd)

      toast.success('Contrat signé téléchargé et sauvegardé')
      onSigned?.()
      onClose()
    } catch {
      toast.error('Erreur lors de la génération')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Signez dans les zones ci-dessous, puis téléchargez le PDF.</p>
      <SignatureCanvas ref={clientRef} label="Signature du Client" />
      {contract.secondDriverName && (
        <SignatureCanvas ref={driver2Ref} label={`Signature du 2ème conducteur (${contract.secondDriverName})`} />
      )}
      <SignatureCanvas ref={agencyRef} label="Signature de l'Agence" />
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-fit justify-center">Annuler</button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="btn-primary flex items-center gap-2 w-full sm:w-fit justify-center"
        >
          <FileDown className="w-4 h-4" />
          {loading ? 'Génération...' : 'Télécharger PDF signé'}
        </button>
      </div>
    </div>
  )
}

function SignedContractModal({ agencyId, contract, onRefresh }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const docs = contract.documents || []

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'SIGNED_CONTRACT')
      await uploadContractDocument(agencyId, contract.id, fd)
      toast.success('Contrat signé uploadé')
      setFile(null)
      onRefresh()
    } catch {
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId) => {
    if (!confirm('Supprimer ce document ?')) return
    try {
      await deleteContractDocument(agencyId, contract.id, docId)
      toast.success('Document supprimé')
      onRefresh()
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <div className="space-y-4">
      {docs.length > 0 ? (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSignature className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">{doc.filename}</p>
                  <p className="text-xs text-green-600">{fmtDate(doc.createdAt)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={getFileUrl(doc.url, agencyId)} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-green-100 rounded" title="Voir">
                  <Eye className="w-4 h-4 text-green-700" />
                </a>
                <button onClick={() => handleDelete(doc.id)} className="p-1.5 hover:bg-red-50 rounded" title="Supprimer">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-400">
          <FileSignature className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun contrat signé uploadé</p>
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-3 border-t pt-4">
        <label className="label">Ajouter un scan (PDF, image)</label>
        <input
          type="file"
          accept="image/*,application/pdf,.pdf"
          capture="environment"
          className="input text-sm"
          onChange={e => setFile(e.target.files[0])}
        />
        <button type="submit" disabled={!file || uploading} className="btn-primary flex items-center gap-2 w-full justify-center">
          <Upload className="w-4 h-4" />
          {uploading ? 'Upload en cours...' : 'Uploader le contrat signé'}
        </button>
      </form>
    </div>
  )
}

function PeriodicPaymentsPanel({ agencyId, contractId, currency }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ periodStart: '', periodEnd: '', amount: '', paidAt: '', notes: '' })

  const { data: payments = [] } = useQuery({
    queryKey: ['periodicPayments', contractId],
    queryFn: () => getPeriodicPayments(agencyId, contractId).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data) => createPeriodicPayment(agencyId, contractId, data),
    onSuccess: () => { qc.invalidateQueries(['periodicPayments', contractId]); setShowAdd(false); setAddForm({ periodStart: '', periodEnd: '', amount: '', paidAt: '', notes: '' }); toast.success('Période ajoutée') },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updatePeriodicPayment(agencyId, contractId, id, data),
    onSuccess: () => { qc.invalidateQueries(['periodicPayments', contractId]); toast.success('Mis à jour') },
  })
  const deleteMut = useMutation({
    mutationFn: (id) => deletePeriodicPayment(agencyId, contractId, id),
    onSuccess: () => { qc.invalidateQueries(['periodicPayments', contractId]); toast.success('Supprimé') },
  })

  const totalAmount = payments.reduce((s, p) => s + p.amount, 0)
  const totalPaid = payments.filter(p => p.paidAt).reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500">Total : <strong>{totalAmount.toLocaleString()} {currency}</strong></span>
          <span className="text-green-600">Payé : <strong>{totalPaid.toLocaleString()} {currency}</strong></span>
          {totalAmount - totalPaid > 0 && <span className="text-orange-500">Reste : <strong>{(totalAmount - totalPaid).toLocaleString()} {currency}</strong></span>}
        </div>
        <button onClick={() => setShowAdd(v => !v)} className="btn-secondary text-xs py-1 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Période
        </button>
      </div>

      {showAdd && (
        <form onSubmit={e => { e.preventDefault(); createMut.mutate(addForm) }} className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><label className="label text-xs">Début période *</label><input className="input py-1 text-sm" type="date" required value={addForm.periodStart} onChange={e => setAddForm(f => ({ ...f, periodStart: e.target.value }))} /></div>
            <div><label className="label text-xs">Fin période *</label><input className="input py-1 text-sm" type="date" required value={addForm.periodEnd} onChange={e => setAddForm(f => ({ ...f, periodEnd: e.target.value }))} /></div>
            <div><label className="label text-xs">Montant *</label><input className="input py-1 text-sm" type="number" required value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><label className="label text-xs">Date paiement</label><input className="input py-1 text-sm" type="date" value={addForm.paidAt} onChange={e => setAddForm(f => ({ ...f, paidAt: e.target.value }))} /></div>
          </div>
          <div><label className="label text-xs">Notes</label><input className="input py-1 text-sm" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs py-1">Ajouter</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-xs py-1">Annuler</button>
          </div>
        </form>
      )}

      <div className="space-y-1.5">
        {payments.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${p.paidAt ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'}`}>
            <div className="flex items-center gap-2">
              {p.paidAt
                ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                : <Circle className="w-4 h-4 text-orange-400 shrink-0" />}
              <div>
                <span className="font-medium">{p.amount.toLocaleString()} {currency}</span>
                <span className="text-gray-500 ml-2 text-xs">{fmtDate(p.periodStart)} → {fmtDate(p.periodEnd)}</span>
                {p.notes && <span className="text-gray-400 ml-2 text-xs">{p.notes}</span>}
                {p.paidAt && <span className="text-green-600 ml-2 text-xs">payé le {fmtDate(p.paidAt)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!p.paidAt && (
                <button
                  onClick={() => updateMut.mutate({ id: p.id, data: { paidAt: format(new Date(), 'yyyy-MM-dd') } })}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-0.5 rounded"
                >
                  Marquer payé
                </button>
              )}
              {p.paidAt && (
                <button
                  onClick={() => updateMut.mutate({ id: p.id, data: { paidAt: null } })}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded"
                >
                  Annuler paiement
                </button>
              )}
              <button onClick={() => { if (confirm('Supprimer cette période ?')) deleteMut.mutate(p.id) }} className="p-1 hover:bg-red-50 rounded">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {payments.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Aucune période enregistrée</p>}
      </div>
    </div>
  )
}

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
      <label className="label flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Rechercher un client existant</label>
      <input
        className="input"
        placeholder="Nom, téléphone, N° pièce..."
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && clients.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {clients.map(c => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
              onClick={() => { onSelect(c); setSearch(`${c.firstName} ${c.lastName}`); setOpen(false) }}
            >
              <span className="font-medium">{c.firstName} {c.lastName}</span>
              {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
              {c.idNumber && <span className="text-gray-400 ml-2">· {c.idType} {c.idNumber}</span>}
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
  const isOther = !!value && !memberNames.includes(value)
  const [mode, setMode] = useState(isOther ? 'other' : 'member')

  return (
    <div className="space-y-1.5">
      {mode === 'member' ? (
        <select
          className="input"
          value={memberNames.includes(value) ? value : ''}
          onChange={(e) => {
            if (e.target.value === '__other__') { setMode('other'); onChange('') }
            else onChange(e.target.value)
          }}
        >
          <option value="">-- Choisir un membre --</option>
          {members.map(m => (
            <option key={m.id} value={`${m.user.firstName} ${m.user.lastName}`}>{m.user.firstName} {m.user.lastName}</option>
          ))}
          <option value="__other__">Autre personne...</option>
        </select>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Nom de la personne" />
          <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => { setMode('member'); onChange('') }}>
            Membre de l'agence
          </button>
        </div>
      )}
    </div>
  )
}

function ContractForm({ initial, cars, agencyId, onSubmit, loading }) {
  const [form, setForm] = useState(initial || {
    carId: '', clientId: '', clientType: 'INDIVIDUAL', clientName: '', clientPhone: '', clientEmail: '', clientIdNumber: '', clientAddress: '',
    startDate: '', endDate: '', rentalAmount: '', guaranteeAmount: '', currency: 'MAD',
    guaranteeCheck: false, guaranteeCheckNumber: '', isSubRental: false, subrenterName: '',
    startMileage: '', notes: '', amountPaid: '', collectedBy: '', collectedAt: '',
    rentalType: 'STANDARD', periodUnit: 'MONTH', intervalType: 'CLOSED', allowOverage: false,
    startTime: '', endTime: '', pickupLocation: '', dropoffLocation: '',
    clientLicenseNumber: '',
    secondDriverName: '', secondDriverIdNumber: '', secondDriverIdExpiry: '',
    secondDriverLicense: '', secondDriverLicenseExpiry: '',
  })
  const [hasSecondDriver, setHasSecondDriver] = useState(!!(initial?.secondDriverName))
  const [carSearch, setCarSearch] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleQRScan = (text) => {
    const match = text.match(/^rental:car:(.+)$/)
    if (!match) return
    const found = cars.find(c => c.id === match[1])
    if (found) {
      setForm(f => ({ ...f, carId: found.id }))
      setCarSearch(`${found.brand} ${found.model}`)
    }
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
      clientAddress: client.address || f.clientAddress,
      clientLicenseNumber: client.clientType === 'COMPANY' ? '' : (client.licenseNumber || f.clientLicenseNumber),
    }))
  }

  const filteredCars = cars
    .filter(c => c.status === 'AVAILABLE' || c.id === form.carId)
    .filter(c => !carSearch || `${c.brand} ${c.model} ${c.finalPlate || ''} ${c.wwPlate || ''}`.toLowerCase().includes(carSearch.toLowerCase()))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="label">Véhicule *</label>
        <div className="flex gap-2 mb-1">
          <input className="input flex-1" placeholder="Rechercher un véhicule..." value={carSearch} onChange={e => setCarSearch(e.target.value)} />
          <button type="button" onClick={() => setScannerOpen(true)} className="btn-secondary flex items-center gap-1.5 px-3 shrink-0" title="Scanner QR code">
            <ScanLine className="w-4 h-4" /> QR
          </button>
        </div>
        <select className="input" value={form.carId} onChange={set('carId')} required size={Math.min(filteredCars.length + 1, 5)}>
          <option value="">Choisir un véhicule</option>
          {filteredCars.map(c => (
            <option key={c.id} value={c.id}>{c.brand} {c.model} — {c.finalPlate || c.wwPlate}</option>
          ))}
        </select>
      </div>
      <QRScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onResult={handleQRScan} />

      <h4 className="font-medium text-gray-700">Client</h4>
      {!initial && <ClientSearch agencyId={agencyId} onSelect={handleClientSelect} />}
      {form.clientType === 'COMPANY' && (
        <p className="text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 shrink-0" /> Client Entreprise — permis de conduire non obligatoire
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="label">Nom {form.clientType === 'COMPANY' ? '(entreprise)' : 'complet'} *</label><input className="input" value={form.clientName} onChange={set('clientName')} required /></div>
        <div><label className="label">CIN / Passeport</label><input className="input" value={form.clientIdNumber} onChange={set('clientIdNumber')} /></div>
        {form.clientType !== 'COMPANY' && (
          <div><label className="label">N° Permis de conduire</label><input className="input" value={form.clientLicenseNumber} onChange={set('clientLicenseNumber')} /></div>
        )}
        <div><label className="label">Téléphone</label><input className="input" value={form.clientPhone} onChange={set('clientPhone')} /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={form.clientEmail} onChange={set('clientEmail')} /></div>
      </div>
      <div><label className="label">Adresse</label><input className="input" value={form.clientAddress} onChange={set('clientAddress')} /></div>

      <h4 className="font-medium text-gray-700">Type de location</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.rentalType} onChange={set('rentalType')}>
            {Object.entries(RENTAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Intervalle</label>
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
        <div className="flex items-center gap-2 pt-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!form.allowOverage}
              onChange={e => setForm(f => ({ ...f, allowOverage: !e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">Dépassement non autorisé</span>
          </label>
        </div>
      </div>

      <h4 className="font-medium text-gray-700">Période & Montants</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="label">Date départ *</label><input className="input" type="date" value={form.startDate} onChange={set('startDate')} required /></div>
        <div><label className="label">Heure départ</label><input className="input" type="time" value={form.startTime} onChange={set('startTime')} /></div>
        <div>
          <label className="label">{form.intervalType === 'OPEN' ? 'Date retour estimée *' : 'Date retour *'}</label>
          <input className="input" type="date" value={form.endDate} min={form.startDate || undefined} onChange={set('endDate')} required />
        </div>
        <div><label className="label">Heure retour</label><input className="input" type="time" value={form.endTime} onChange={set('endTime')} /></div>
        <div>
          <label className="label">{form.rentalType === 'PERIODIC' ? `Montant par ${form.periodUnit === 'WEEK' ? 'semaine' : 'mois'} *` : 'Montant location *'}</label>
          <input className="input" type="number" step="0.01" value={form.rentalAmount} onChange={set('rentalAmount')} required />
        </div>
        <div>
          <label className="label">Devise</label>
          <select className="input" value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="label">Km départ</label><input className="input" type="number" value={form.startMileage} onChange={set('startMileage')} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="label">Lieu de récupération</label><input className="input" placeholder="Adresse, agence, aéroport..." value={form.pickupLocation} onChange={set('pickupLocation')} /></div>
        <div><label className="label">Lieu de restitution</label><input className="input" placeholder="Adresse, agence, aéroport..." value={form.dropoffLocation} onChange={set('dropoffLocation')} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="label">Garantie</label><input className="input" type="number" step="0.01" value={form.guaranteeAmount} onChange={set('guaranteeAmount')} /></div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.guaranteeCheck} onChange={set('guaranteeCheck')} className="rounded" />
          <span className="text-sm">Chèque de garantie</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isSubRental} onChange={set('isSubRental')} className="rounded" />
          <span className="text-sm">Sous-location</span>
        </label>
      </div>
      {form.guaranteeCheck && (
        <div><label className="label">N° chèque de garantie</label><input className="input" value={form.guaranteeCheckNumber} onChange={set('guaranteeCheckNumber')} /></div>
      )}
      {form.isSubRental && (
        <div><label className="label">Loueur (sous-location)</label><input className="input" value={form.subrenterName} onChange={set('subrenterName')} /></div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initial && (
          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {form.status === 'PENDING' && <option value="PENDING">{STATUS.PENDING}</option>}
              {Object.entries(SELECTABLE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label">Montant encaissé ({form.currency || 'MAD'})</label>
          <input className="input" type="number" step="0.01" min="0" value={form.amountPaid ?? ''} onChange={set('amountPaid')} placeholder="0.00" />
        </div>
        <div>
          <label className="label">Encaissé par</label>
          <CollectedByInput agencyId={agencyId} value={form.collectedBy ?? ''} onChange={(v) => setForm(f => ({ ...f, collectedBy: v }))} />
        </div>
        <div>
          <label className="label">Date d'encaissement</label>
          <input className="input" type="date" value={form.collectedAt?.split?.('T')[0] ?? form.collectedAt ?? ''} onChange={set('collectedAt')} />
        </div>
      </div>

      <div className="border-t pt-4">
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input type="checkbox" checked={hasSecondDriver} onChange={e => setHasSecondDriver(e.target.checked)} className="rounded" />
          <span className="font-medium text-gray-700">2ème conducteur</span>
        </label>
        {hasSecondDriver && (
          <div className="space-y-3 bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="label">Nom complet</label><input className="input" value={form.secondDriverName} onChange={set('secondDriverName')} placeholder="Nom et prénom" /></div>
              <div><label className="label">N° CIN / Passeport</label><input className="input" value={form.secondDriverIdNumber} onChange={set('secondDriverIdNumber')} /></div>
              <div><label className="label">Expiration CIN</label><input className="input" type="date" value={form.secondDriverIdExpiry?.split?.('T')[0] || form.secondDriverIdExpiry || ''} onChange={set('secondDriverIdExpiry')} /></div>
              <div><label className="label">N° Permis de conduire</label><input className="input" value={form.secondDriverLicense} onChange={set('secondDriverLicense')} /></div>
              <div><label className="label">Expiration permis</label><input className="input" type="date" value={form.secondDriverLicenseExpiry?.split?.('T')[0] || form.secondDriverLicenseExpiry || ''} onChange={set('secondDriverLicenseExpiry')} /></div>
            </div>
          </div>
        )}
      </div>

      <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary w-full sm:w-fit justify-center" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}

function PhotoUploadModal({ agencyId, contract }) {
  const qc = useQueryClient()
  const [files, setFiles] = useState([])
  const [type, setType] = useState('START')
  const [uploading, setUploading] = useState(false)
  const [localPhotos, setLocalPhotos] = useState(contract.photos || [])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!files.length) return toast.error('Sélectionnez des photos')
    setUploading(true)
    const fd = new FormData()
    files.forEach(f => fd.append('photos', f))
    fd.append('type', type)
    try {
      const res = await uploadContractPhotos(agencyId, contract.id, fd)
      setLocalPhotos(prev => [...prev, ...(res.data || [])])
      setFiles([])
      qc.invalidateQueries(['contracts', agencyId])
      toast.success('Photos ajoutées')
    } catch {
      toast.error('Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  const startPhotos = localPhotos.filter(p => p.type === 'START')
  const endPhotos = localPhotos.filter(p => p.type === 'END')

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="label">Type de photo</label>
          <select className="input" value={type} onChange={e => setType(e.target.value)}>
            <option value="START">Début de location</option>
            <option value="END">Fin de location</option>
          </select>
        </div>
        <div>
          <label className="label">Photos de la voiture (plusieurs possibles)</label>
          <input type="file" multiple accept="image/*" className="input" onChange={e => setFiles(Array.from(e.target.files))} />
        </div>
        <button type="submit" className="btn-primary" disabled={uploading || !files.length}>
          {uploading ? 'Upload...' : 'Ajouter les photos'}
        </button>
      </form>

      {startPhotos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-700 mb-2">Début de location ({startPhotos.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {startPhotos.map(p => (
              <a key={p.id} href={getFileUrl(p.url, agencyId)} target="_blank" rel="noreferrer" className="relative block">
                <img src={getFileUrl(p.url, agencyId)} alt="" className="w-full h-24 object-cover rounded-lg hover:opacity-90 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}

      {endPhotos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-blue-700 mb-2">Fin de location ({endPhotos.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {endPhotos.map(p => (
              <a key={p.id} href={getFileUrl(p.url, agencyId)} target="_blank" rel="noreferrer" className="relative block">
                <img src={getFileUrl(p.url, agencyId)} alt="" className="w-full h-24 object-cover rounded-lg hover:opacity-90 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}

      {localPhotos.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">Aucune photo pour ce contrat</p>
      )}
    </div>
  )
}

function ClientCombo({ agencyId, value, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', agencyId, search],
    queryFn: () => getClients(agencyId, search ? { search } : {}).then(r => r.data),
    enabled: search.length >= 1,
  })
  return (
    <div className="relative flex-1 min-w-[10rem] sm:flex-initial">
      <input
        className="input w-full sm:w-48 text-sm"
        placeholder="Filtrer par client..."
        value={search || value?.name || ''}
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

function HistoryTab({ agencyId }) {
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
    queryKey: ['historyContracts', agencyId, params],
    queryFn: () => getContracts(agencyId, params).then(r => r.data),
  })

  const filtered = contracts.filter(c =>
    !search ||
    c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.clientName.toLowerCase().includes(search.toLowerCase()) ||
    (c.clientPhone || '').includes(search)
  )

  const totalAmount = filtered.reduce((s, c) => s + (c.rentalAmount || 0), 0)
  const totalPaid = filtered.reduce((s, c) => s + (c.amountPaid || 0), 0)
  const days = (c) => Math.ceil((new Date(c.endDate) - new Date(c.startDate)) / (1000 * 60 * 60 * 24))

  const hasFilters = clientFilter || carFilter || statusFilter || dateFrom || dateTo || search
  const reset = () => { setClientFilter(null); setCarFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setSearch('') }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-sm text-gray-700">Filtres avancés</span>
          {hasFilters && (
            <button onClick={reset} className="ml-auto flex items-center gap-1 text-xs text-blue-500 hover:underline">
              <X className="w-3 h-3" /> Réinitialiser
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[10rem] sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 w-full sm:w-48 text-sm" placeholder="N° contrat, client..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <ClientCombo agencyId={agencyId} value={clientFilter} onChange={setClientFilter} />
          <select className="input flex-1 min-w-[10rem] sm:flex-initial sm:w-48 text-sm" value={carFilter} onChange={e => setCarFilter(e.target.value)}>
            <option value="">Tous les véhicules</option>
            {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} — {c.finalPlate || c.wwPlate}</option>)}
          </select>
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s ? STATUS[s] : 'Tous'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs text-gray-500">Période départ :</span>
          <input className="input w-full sm:w-36 text-sm" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-xs text-gray-400">→</span>
          <input className="input w-full sm:w-36 text-sm" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm items-center">
        <span className="text-gray-500">{filtered.length} contrat(s)</span>
        {filtered.length > 0 && <>
          <span className="text-gray-700 font-medium">Total : {totalAmount.toLocaleString('fr-MA')} MAD</span>
          <span className={`font-medium ${totalPaid < totalAmount ? 'text-orange-600' : 'text-green-700'}`}>
            Encaissé : {totalPaid.toLocaleString('fr-MA')} MAD
          </span>
        </>}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['N° Contrat', 'Client', 'Véhicule', 'Départ', 'Retour', 'Durée', 'Montant', 'Encaissé', 'Statut'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="py-8 text-center text-gray-400">Chargement...</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono text-xs font-medium">{c.contractNumber}</td>
                <td className="py-3 px-4">
                  <p className="font-medium">{c.clientName}</p>
                  {c.clientPhone && <p className="text-xs text-gray-400">{c.clientPhone}</p>}
                </td>
                <td className="py-3 px-4 text-gray-600">{c.car?.brand} {c.car?.model}<br /><span className="text-xs text-gray-400">{c.car?.finalPlate || c.car?.wwPlate}</span></td>
                <td className="py-3 px-4 text-gray-600">{fmtDate(c.startDate)}</td>
                <td className="py-3 px-4 text-gray-600">{fmtDate(c.endDate)}</td>
                <td className="py-3 px-4 text-gray-500">{days(c)}j</td>
                <td className="py-3 px-4 font-medium">{(c.rentalAmount || 0).toLocaleString()} {c.currency}</td>
                <td className="py-3 px-4">
                  {c.amountPaid >= c.rentalAmount
                    ? <span className="badge-green">Soldé</span>
                    : c.amountPaid > 0
                      ? <span className="badge-yellow">{(c.amountPaid || 0).toLocaleString()}</span>
                      : <span className="badge-gray">Non encaissé</span>}
                </td>
                <td className="py-3 px-4"><span className={STATUS_BADGE[c.status]}>{STATUS[c.status]}</span></td>
              </tr>
            ))}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={9} className="py-8 text-center text-gray-400">Aucun résultat</td></tr>
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}

function ClientHistoryTab({ agencyId }) {
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientOpen, setClientOpen] = useState(false)

  const { data: clientResults = [] } = useQuery({
    queryKey: ['clientsSearch', agencyId, clientSearch],
    queryFn: () => getClients(agencyId, { search: clientSearch }).then(r => r.data),
    enabled: clientSearch.length >= 1,
  })

  const { data: clientData, isLoading } = useQuery({
    queryKey: ['clientHistory', agencyId, selectedClient?.id],
    queryFn: () => getClient(agencyId, selectedClient.id).then(r => r.data),
    enabled: !!selectedClient?.id,
  })

  const contracts = clientData?.contracts || []
  const totalAmount = contracts.reduce((s, c) => s + (c.rentalAmount || 0), 0)
  const totalPaid = contracts.reduce((s, c) => s + (c.amountPaid || 0), 0)
  const fmt = (n) => `${(n || 0).toLocaleString('fr-MA')} MAD`
  const days = (c) => Math.ceil((new Date(c.endDate) - new Date(c.startDate)) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-5">
      {/* Client search */}
      <div className="card">
        <label className="label flex items-center gap-1 mb-2"><UserCheck className="w-4 h-4" /> Rechercher un client</label>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Nom, téléphone, N° pièce..."
            value={clientSearch || selectedClient?.name || ''}
            onChange={e => { setClientSearch(e.target.value); if (!e.target.value) setSelectedClient(null); setClientOpen(true) }}
            onFocus={() => setClientOpen(true)}
            onBlur={() => setTimeout(() => setClientOpen(false), 150)}
          />
          {clientOpen && clientResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
              {clientResults.map(c => (
                <button key={c.id} type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
                  onClick={() => { setSelectedClient({ id: c.id, name: `${c.firstName} ${c.lastName}` }); setClientSearch(''); setClientOpen(false) }}>
                  <span className="font-medium">{c.firstName} {c.lastName}</span>
                  {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
                  {c.idNumber && <span className="text-gray-400 ml-2">· {c.idType} {c.idNumber}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedClient && (
          <button onClick={() => { setSelectedClient(null); setClientSearch('') }} className="mt-2 text-xs text-gray-400 hover:text-red-400 flex items-center gap-1">
            <X className="w-3 h-3" /> Effacer
          </button>
        )}
      </div>

      {!selectedClient && (
        <div className="text-center py-12 text-gray-400">
          <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Recherchez un client pour voir son historique de réservations</p>
        </div>
      )}

      {selectedClient && isLoading && <p className="text-center py-8 text-gray-400">Chargement...</p>}

      {selectedClient && !isLoading && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 mb-1">Locations</p>
              <p className="text-2xl font-bold text-gray-800">{contracts.length}</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 mb-1">Montant total</p>
              <p className="text-xl font-bold text-gray-800">{fmt(totalAmount)}</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 mb-1">Total encaissé</p>
              <p className={`text-xl font-bold ${totalPaid < totalAmount ? 'text-orange-600' : 'text-green-700'}`}>{fmt(totalPaid)}</p>
            </div>
          </div>

          {contracts.length === 0 && (
            <p className="text-center text-gray-400 py-6">Aucun contrat pour ce client</p>
          )}

          {/* Contract list */}
          {contracts.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['N° Contrat', 'Véhicule', 'Départ', 'Retour', 'Durée', 'Montant', 'Encaissé', 'Statut'].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-medium text-gray-600 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs font-medium">{c.contractNumber}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{c.car?.brand} {c.car?.model}</p>
                        <p className="text-xs text-gray-400">{c.car?.finalPlate || c.car?.wwPlate}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{fmtDate(c.startDate)}</td>
                      <td className="py-3 px-4 text-gray-600">{fmtDate(c.endDate)}</td>
                      <td className="py-3 px-4 text-gray-500">{days(c)}j</td>
                      <td className="py-3 px-4 font-medium">{(c.rentalAmount || 0).toLocaleString()} {c.currency}</td>
                      <td className="py-3 px-4">
                        {c.amountPaid >= c.rentalAmount
                          ? <span className="badge-green">Soldé</span>
                          : c.amountPaid > 0
                            ? <span className="badge-yellow">{(c.amountPaid || 0).toLocaleString()}</span>
                            : <span className="badge-gray">Non encaissé</span>}
                      </td>
                      <td className="py-3 px-4"><span className={STATUS_BADGE[c.status]}>{STATUS[c.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}

          {/* Notes from contracts */}
          {contracts.some(c => c.notes) && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Notes des contrats</p>
              {contracts.filter(c => c.notes).map(c => (
                <div key={c.id} className="bg-gray-50 rounded-lg px-4 py-2 text-sm">
                  <span className="text-xs text-gray-400 font-mono mr-2">{c.contractNumber}</span>
                  <span className="text-gray-600 italic">{c.notes}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Contracts() {
  const { agencyId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState('contracts')
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [contractScannerOpen, setContractScannerOpen] = useState(false)
  const [prefillData, setPrefillData] = useState(null)

  useEffect(() => {
    const carId = searchParams.get('carId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (carId) {
      setPrefillData({ carId, startDate: startDate || '', endDate: endDate || '' })
      setModal({ type: 'create' })
      setSearchParams({}, { replace: true })
    }
  }, [])

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', agencyId, statusFilter],
    queryFn: () => getContracts(agencyId, { status: statusFilter || undefined }).then(r => r.data),
  })
  const { data: cars = [] } = useQuery({
    queryKey: ['cars', agencyId],
    queryFn: () => getCars(agencyId).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => createContract(agencyId, data),
    onSuccess: () => { qc.invalidateQueries(['contracts', agencyId]); setModal(null); toast.success('Contrat créé') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateContract(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['contracts', agencyId]); setModal(null); toast.success('Mis à jour') },
    onError: () => toast.error('Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteContract(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['contracts', agencyId]); toast.success('Supprimé') },
    onError: () => toast.error('Erreur'),
  })

  const filtered = contracts.filter(c =>
    !search || c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.clientName.toLowerCase().includes(search.toLowerCase())
  )

  const handleContractQRScan = (text) => {
    const match = text.match(/^rental:contract:(.+)$/)
    if (!match) { toast.error('QR code invalide'); return }
    const contractNumber = match[1]
    setSearch(contractNumber)
    setContractScannerOpen(false)
    toast.success(`Contrat ${contractNumber} recherché`)
  }

  const renderContractActions = (c) => (
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={async () => {
          try {
            const res = await downloadContractPdf(agencyId, c.id)
            const url = URL.createObjectURL(res.data)
            const a = document.createElement('a')
            a.href = url
            a.download = `contrat-${c.contractNumber}.pdf`
            a.click()
            URL.revokeObjectURL(url)
          } catch {
            toast.error('Erreur lors du téléchargement')
          }
        }}
        className="p-1.5 hover:bg-gray-100 rounded" title="Télécharger PDF"
      >
        <FileDown className="w-3.5 h-3.5 text-blue-500" />
      </button>
      <button
        onClick={() => setModal({ type: 'signature', contract: c })}
        className="p-1.5 hover:bg-purple-50 rounded" title="Signer & Télécharger PDF"
      >
        <PenLine className="w-3.5 h-3.5 text-purple-500" />
      </button>
      <button onClick={() => setModal({ type: 'photos', contract: c })} className="p-1.5 hover:bg-gray-100 rounded" title="Photos de la voiture">
        <Camera className="w-3.5 h-3.5 text-green-500" />
      </button>
      {c.rentalType === 'PERIODIC' && (
        <button onClick={() => setModal({ type: 'payments', contract: c })} className="p-1.5 hover:bg-blue-50 rounded" title="Paiements périodiques">
          <CalendarRange className="w-3.5 h-3.5 text-blue-500" />
        </button>
      )}
      <button onClick={() => setModal({ type: 'signed', contract: c })} className={`p-1.5 rounded ${c.documents?.length > 0 ? 'hover:bg-green-50' : 'hover:bg-gray-100'}`} title="Contrat signé">
        <FileSignature className={`w-3.5 h-3.5 ${c.documents?.length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
      </button>
      <button onClick={() => setModal({ type: 'sinistres', contract: c })} className="p-1.5 hover:bg-orange-50 rounded" title="Sinistres">
        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
      </button>
      <button onClick={() => setModal({ type: 'edit', contract: c })} className="p-1.5 hover:bg-gray-100 rounded" title="Modifier">
        <Edit2 className="w-3.5 h-3.5 text-gray-500" />
      </button>
      <button onClick={() => { if (confirm('Supprimer ce contrat ?')) deleteMutation.mutate(c.id) }} className="p-1.5 hover:bg-red-50 rounded" title="Supprimer">
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  )

  const renderContractBadges = (c) => (
    <div className="flex gap-1 flex-wrap">
      {c.rentalType === 'PERIODIC' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-sans font-medium">Périodique · {c.periodUnit === 'WEEK' ? 'Sem.' : 'Mois'}</span>}
      {c.intervalType === 'OPEN' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-sans font-medium">Ouvert</span>}
      {!c.allowOverage && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-sans font-medium">Dép. non autorisé</span>}
      {c.documents?.length > 0 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-sans font-medium flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Signé</span>}
    </div>
  )

  const renderPaymentBadge = (c) => (
    c.amountPaid >= c.rentalAmount
      ? <span className="badge-green">Encaissé</span>
      : c.amountPaid > 0
        ? <span className="badge-yellow">{c.amountPaid.toLocaleString()} / {c.rentalAmount.toLocaleString()}</span>
        : <span className="badge-gray">Non encaissé</span>
  )

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-fit overflow-x-auto">
        <button onClick={() => setTab('contracts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${tab === 'contracts' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          <FileDown className="w-4 h-4" /> Contrats
        </button>
        <button onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${tab === 'history' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          <History className="w-4 h-4" /> Historique
        </button>
        <button onClick={() => setTab('client')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${tab === 'client' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          <UserCheck className="w-4 h-4" /> Par client
        </button>
      </div>

      {tab === 'history' && <HistoryTab agencyId={agencyId} />}
      {tab === 'client' && <ClientHistoryTab agencyId={agencyId} />}

      {tab === 'contracts' && <>
      <div className="flex flex-col lg:flex-row gap-3 lg:justify-between lg:items-center">
        <div className="flex gap-2 flex-wrap overflow-x-auto">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap shrink-0 ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {s ? STATUS[s] : 'Tous'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 w-full sm:w-56" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setContractScannerOpen(true)} className="btn-secondary flex items-center gap-1.5 px-3 shrink-0" title="Scanner QR contrat">
            <ScanLine className="w-4 h-4" /> QR
          </button>
          <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2 shrink-0 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Nouveau Contrat
          </button>
        </div>
      </div>
      <QRScanner isOpen={contractScannerOpen} onClose={() => setContractScannerOpen(false)} onResult={handleContractQRScan} />

      {/* Mobile: card list */}
      <div className="lg:hidden space-y-3">
        {isLoading && <div className="card text-center py-8 text-gray-400">Chargement...</div>}
        {!isLoading && filtered.map(c => (
          <div key={c.id} className="card space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-medium">{c.contractNumber}</p>
                {renderContractBadges(c)}
              </div>
              <span className={STATUS_BADGE[c.status]}>{STATUS[c.status]}</span>
            </div>
            <div>
              <p className="font-medium">{c.clientName}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {c.isSubRental && !c.bookedByAgency && <span className="badge-yellow text-xs">Sous-location</span>}
                {c.bookedByAgency && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                    Réservé par {c.bookedByAgency.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{c.car?.brand} {c.car?.model} <span className="text-xs text-gray-400">— {c.car?.finalPlate || c.car?.wwPlate}</span></span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>
              <span className="text-xs text-gray-400">créé le {fmtDate(c.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{c.rentalAmount.toLocaleString()} {c.currency}</span>
              <div className="text-right">
                {renderPaymentBadge(c)}
                {c.collectedBy && <p className="text-xs text-gray-400 mt-0.5">par {c.collectedBy}</p>}
                {c.collectedAt && <p className="text-xs text-gray-400">le {fmtDate(c.collectedAt)}</p>}
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              {renderContractActions(c)}
            </div>
          </div>
        ))}
        {!isLoading && !filtered.length && (
          <div className="card text-center py-8 text-gray-400">Aucun contrat</div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block card p-0 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['N° Contrat', 'Client', 'Véhicule', 'Départ', 'Retour', 'Créé le', 'Montant', 'Encaissement', 'Statut', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={10} className="py-8 text-center text-gray-400">Chargement...</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono text-xs font-medium">
                  {c.contractNumber}
                  <div className="mt-0.5">{renderContractBadges(c)}</div>
                </td>
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium">{c.clientName}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {c.isSubRental && !c.bookedByAgency && <span className="badge-yellow text-xs">Sous-location</span>}
                      {c.bookedByAgency && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                          Réservé par {c.bookedByAgency.name}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">{c.car?.brand} {c.car?.model}<br /><span className="text-xs text-gray-400">{c.car?.finalPlate || c.car?.wwPlate}</span></td>
                <td className="py-3 px-4 text-gray-600">{fmtDate(c.startDate)}</td>
                <td className="py-3 px-4 text-gray-600">{fmtDate(c.endDate)}</td>
                <td className="py-3 px-4 text-gray-400 text-xs">{fmtDate(c.createdAt)}</td>
                <td className="py-3 px-4 font-medium">{c.rentalAmount.toLocaleString()} {c.currency}</td>
                <td className="py-3 px-4">
                  {renderPaymentBadge(c)}
                  {c.collectedBy && <p className="text-xs text-gray-400 mt-0.5">par {c.collectedBy}</p>}
                  {c.collectedAt && <p className="text-xs text-gray-400">le {fmtDate(c.collectedAt)}</p>}
                </td>
                <td className="py-3 px-4"><span className={STATUS_BADGE[c.status]}>{STATUS[c.status]}</span></td>
                <td className="py-3 px-4">{renderContractActions(c)}</td>
              </tr>
            ))}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={10} className="py-8 text-center text-gray-400">Aucun contrat</td></tr>
            )}
          </tbody>
        </table></div>
      </div>

      </>}

      <Modal isOpen={modal?.type === 'create'} onClose={() => { setModal(null); setPrefillData(null) }} title="Nouveau Contrat" size="xl">
        <ContractForm
          initial={prefillData || undefined}
          cars={cars}
          agencyId={agencyId}
          onSubmit={createMutation.mutate}
          loading={createMutation.isPending}
        />
      </Modal>
      <Modal isOpen={modal?.type === 'edit'} onClose={() => setModal(null)} title="Modifier Contrat" size="xl">
        {modal?.contract && (
          <ContractForm
            initial={{
              ...modal.contract,
              startDate: modal.contract.startDate?.split('T')[0],
              endDate: modal.contract.endDate?.split('T')[0],
              amountPaid: modal.contract.amountPaid ?? 0,
              collectedBy: modal.contract.collectedBy ?? '',
              collectedAt: modal.contract.collectedAt?.split('T')[0] ?? '',
            }}
            cars={cars}
            agencyId={agencyId}
            onSubmit={(data) => updateMutation.mutate({ id: modal.contract.id, data })}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
      <Modal isOpen={modal?.type === 'photos'} onClose={() => setModal(null)} title="Photos de la voiture" size="lg">
        {modal?.contract && <PhotoUploadModal agencyId={agencyId} contract={modal.contract} />}
      </Modal>
      <Modal isOpen={modal?.type === 'payments'} onClose={() => setModal(null)} title={`Paiements — ${modal?.contract?.contractNumber}`} size="lg">
        {modal?.contract && (
          <PeriodicPaymentsPanel agencyId={agencyId} contractId={modal.contract.id} currency={modal.contract.currency} />
        )}
      </Modal>
      <Modal isOpen={modal?.type === 'signed'} onClose={() => setModal(null)} title={`Contrat signé — ${modal?.contract?.contractNumber}`} size="md">
        {modal?.contract && (
          <SignedContractModal
            agencyId={agencyId}
            contract={modal.contract}
            onRefresh={() => qc.invalidateQueries(['contracts', agencyId])}
          />
        )}
      </Modal>
      <Modal isOpen={modal?.type === 'sinistres'} onClose={() => setModal(null)} title={`Sinistres — ${modal?.contract?.contractNumber}`} size="lg">
        {modal?.contract && (
          <SinistresModal
            agencyId={agencyId}
            contract={modal.contract}
            allCars={cars}
          />
        )}
      </Modal>
      <Modal isOpen={modal?.type === 'signature'} onClose={() => setModal(null)} title={`Signer le contrat — ${modal?.contract?.contractNumber}`} size="lg">
        {modal?.contract && (
          <SignaturePdfModal
            agencyId={agencyId}
            contract={modal.contract}
            onClose={() => setModal(null)}
            onSigned={() => qc.invalidateQueries(['contracts', agencyId])}
          />
        )}
      </Modal>
    </div>
  )
}
