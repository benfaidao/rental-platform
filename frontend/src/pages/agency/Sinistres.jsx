import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSinistres, createSinistre, updateSinistre, deleteSinistre, uploadSinistrePhotos, deleteSinistrePhoto, getCars } from '../../api'
import { AlertTriangle, Plus, Trash2, Upload, X, CheckCircle, Clock, Camera, Edit2, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'
const API_URL = import.meta.env.VITE_API_URL || '/api'
const imgSrc  = (url) => url.startsWith('http') ? url : `${API_URL.replace('/api', '')}${url}`

const STATUS_LABELS  = { OPEN: 'Ouvert', RESOLVED: 'Résolu' }
const STATUS_COLORS  = { OPEN: 'bg-orange-100 text-orange-700', RESOLVED: 'bg-green-100 text-green-700' }

function SinistreForm({ cars, preselectedCarId, preselectedContractId, preselectedContractNumber, onSubmit, loading, initial }) {
  const [form, setForm] = useState({
    carId:           initial?.carId           ?? preselectedCarId         ?? '',
    title:           initial?.title           ?? '',
    description:     initial?.description     ?? '',
    collectedAmount: initial?.collectedAmount  != null ? String(initial.collectedAmount) : '',
    collectionDate:  initial?.collectionDate   ? initial.collectionDate.split('T')[0] : '',
    status:          initial?.status           ?? 'OPEN',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.carId) return toast.error('Sélectionner un véhicule')
    onSubmit({
      carId:           form.carId,
      contractId:      preselectedContractId || undefined,
      title:           form.title || undefined,
      description:     form.description || undefined,
      collectedAmount: form.collectedAmount ? parseFloat(form.collectedAmount) : undefined,
      collectionDate:  form.collectionDate || undefined,
      status:          form.status,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!preselectedCarId && (
        <div>
          <label className="label">Véhicule *</label>
          <select className="input" value={form.carId} onChange={set('carId')} required>
            <option value="">Choisir un véhicule</option>
            {cars.map(c => (
              <option key={c.id} value={c.id}>{c.brand} {c.model} — {c.finalPlate || c.wwPlate || ''}</option>
            ))}
          </select>
        </div>
      )}
      {preselectedContractNumber && (
        <div className="text-sm bg-blue-50 text-blue-700 rounded-lg px-3 py-2">
          Lié au contrat <span className="font-semibold">{preselectedContractNumber}</span>
        </div>
      )}
      <div>
        <label className="label">Titre</label>
        <input className="input" value={form.title} onChange={set('title')} placeholder="Ex: Accident, Bris de glace, Vol..." />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-[80px]" value={form.description} onChange={set('description')} placeholder="Décrire le sinistre..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Montant encaissé</label>
          <input className="input" type="number" step="0.01" min="0" value={form.collectedAmount} onChange={set('collectedAmount')} placeholder="0.00" />
        </div>
        <div>
          <label className="label">Date d'encaissement</label>
          <input className="input" type="date" value={form.collectionDate} onChange={set('collectionDate')} />
        </div>
      </div>
      {initial && (
        <div>
          <label className="label">Statut</label>
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="OPEN">Ouvert</option>
            <option value="RESOLVED">Résolu</option>
          </select>
        </div>
      )}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Enregistrement...' : (initial ? 'Mettre à jour' : 'Créer le sinistre')}
      </button>
    </form>
  )
}

function PhotosPanel({ agencyId, sinistre }) {
  const qc = useQueryClient()
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('photos', f))
      await uploadSinistrePhotos(agencyId, sinistre.id, fd)
      qc.invalidateQueries(['sinistres', agencyId])
      toast.success('Photos ajoutées')
    } catch {
      toast.error('Erreur upload')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const deletePhoto = async (photoId) => {
    if (!confirm('Supprimer cette photo ?')) return
    try {
      await deleteSinistrePhoto(agencyId, sinistre.id, photoId)
      qc.invalidateQueries(['sinistres', agencyId])
      toast.success('Photo supprimée')
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{sinistre.photos?.length || 0} photo(s)</span>
        <button
          onClick={() => fileRef.current?.click()}
          className="btn-secondary text-xs py-1.5 flex items-center gap-1"
          disabled={uploading}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Upload...' : 'Ajouter photos'}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
      {sinistre.photos?.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {sinistre.photos.map(photo => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square">
              <img src={imgSrc(photo.url)} alt="sinistre" className="w-full h-full object-cover" />
              <button
                onClick={() => deletePhoto(photo.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * SinistresModal — affiché dans une Modal parente.
 * Props:
 *   agencyId          — requis
 *   car               — objet car { id, brand, model, finalPlate, wwPlate } (mode véhicule)
 *   contract          — objet contract { id, contractNumber, carId } (mode contrat)
 *   allCars           — liste de tous les véhicules de l'agence
 */
export default function SinistresModal({ agencyId, car, contract, allCars = [] }) {
  const qc = useQueryClient()
  const [view, setView]         = useState('list')   // 'list' | 'create' | { type:'edit'|'photos', sinistre }
  const [expanded, setExpanded] = useState(null)

  const filterParams = {}
  if (car)      filterParams.carId      = car.id
  if (contract) filterParams.contractId = contract.id

  const { data: sinistres = [], isLoading } = useQuery({
    queryKey: ['sinistres', agencyId, filterParams],
    queryFn: () => getSinistres(agencyId, filterParams).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => createSinistre(agencyId, data),
    onSuccess: () => { qc.invalidateQueries(['sinistres', agencyId]); setView('list'); toast.success('Sinistre créé') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSinistre(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['sinistres', agencyId]); setView('list'); toast.success('Mis à jour') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSinistre(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['sinistres', agencyId]); toast.success('Sinistre supprimé') },
    onError: () => toast.error('Erreur'),
  })

  const preselectedCarId = car?.id ?? (contract ? allCars.find(c => c.id === contract.carId)?.id : undefined)

  // ── Formulaire création ──────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          ← Retour
        </button>
        <SinistreForm
          cars={allCars}
          preselectedCarId={preselectedCarId}
          preselectedContractId={contract?.id}
          preselectedContractNumber={contract?.contractNumber}
          onSubmit={createMutation.mutate}
          loading={createMutation.isPending}
        />
      </div>
    )
  }

  // ── Formulaire édition ───────────────────────────────────────────────────────
  if (view?.type === 'edit') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          ← Retour
        </button>
        <SinistreForm
          cars={allCars}
          preselectedCarId={view.sinistre.carId}
          preselectedContractId={view.sinistre.contractId}
          preselectedContractNumber={view.sinistre.contract?.contractNumber}
          initial={view.sinistre}
          onSubmit={(data) => updateMutation.mutate({ id: view.sinistre.id, data })}
          loading={updateMutation.isPending}
        />
      </div>
    )
  }

  // ── Liste ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {isLoading ? 'Chargement...' : `${sinistres.length} sinistre(s)`}
        </span>
        <button onClick={() => setView('create')} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nouveau sinistre
        </button>
      </div>

      {!isLoading && sinistres.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Aucun sinistre enregistré</p>
        </div>
      )}

      <div className="space-y-3">
        {sinistres.map(s => (
          <div key={s.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header ligne */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.title && (
                      <span className="text-sm font-semibold text-gray-900">{s.title}</span>
                    )}
                    <span className="text-sm text-gray-600">
                      {s.car ? `${s.car.brand} ${s.car.model} — ${s.car.finalPlate || s.car.wwPlate || ''}` : '—'}
                    </span>
                    {s.contract && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s.contract.contractNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDate(s.createdAt)}</span>
                    {s.collectedAmount > 0 && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />{s.collectedAmount} MAD
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setView({ type: 'edit', sinistre: s })}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                  title="Modifier"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button
                  onClick={() => { if (confirm('Supprimer ce sinistre ?')) deleteMutation.mutate(s.id) }}
                  className="p-1.5 hover:bg-red-50 rounded-lg"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>

            {/* Détails expandés */}
            {expanded === s.id && (
              <div className="px-4 pb-4 border-t border-gray-100 space-y-4 pt-3">
                {s.description && (
                  <p className="text-sm text-gray-600 whitespace-pre-line">{s.description}</p>
                )}
                {s.collectedAmount > 0 && (
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Montant encaissé :</span>{' '}
                      <span className="font-semibold text-green-700">{s.collectedAmount} MAD</span>
                    </div>
                    {s.collectionDate && (
                      <div>
                        <span className="text-gray-500">Date encaissement :</span>{' '}
                        <span className="font-medium">{fmtDate(s.collectionDate)}</span>
                      </div>
                    )}
                  </div>
                )}
                <PhotosPanel agencyId={agencyId} sinistre={s} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
