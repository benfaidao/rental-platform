import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCar, uploadCarDocument } from '../../api'
import { ArrowLeft, Car, Camera, X, Star, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const FUEL_TYPES = ['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL']
const TRANSMISSIONS = ['Manuelle', 'Automatique']

export default function NewCar() {
  const { agencyId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    wwPlate: '', finalPlate: '', brand: '', model: '', year: '', color: '',
    fuelType: '', mileage: '', transmission: '', rentalPriceTTC: '',
    purchasePrice: '', purchaseDate: '',
    authorizationDate: '', insuranceExpiry: '',
    lastTechnicalInspection: '', nextTechnicalInspection: '',
    circulationAuthExpiry: '', notes: '',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const [photoFiles, setPhotoFiles] = useState([])
  const [mainPhotoIdx, setMainPhotoIdx] = useState(0)
  const [uploading, setUploading] = useState(false)

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setPhotoFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removePhoto = (idx) => {
    setPhotoFiles(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (mainPhotoIdx >= next.length) setMainPhotoIdx(Math.max(0, next.length - 1))
      else if (idx < mainPhotoIdx) setMainPhotoIdx(mainPhotoIdx - 1)
      return next
    })
  }

  const createMutation = useMutation({
    mutationFn: (data) => createCar(agencyId, data),
    onSuccess: async (res) => {
      const carId = res.data.id
      if (photoFiles.length > 0) {
        setUploading(true)
        try {
          for (let i = 0; i < photoFiles.length; i++) {
            const fd = new FormData()
            fd.append('file', photoFiles[i])
            fd.append('type', 'PHOTO')
            if (i === mainPhotoIdx) fd.append('isMainPhoto', 'true')
            await uploadCarDocument(agencyId, carId, fd)
          }
        } catch {
          toast.error('Erreur lors de l\'upload de certaines photos')
        } finally {
          setUploading(false)
        }
      }
      qc.invalidateQueries(['cars', agencyId])
      toast.success('Véhicule ajouté')
      navigate(`/agency/${agencyId}/cars`)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const isPending = createMutation.isPending || uploading

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          to={`/agency/${agencyId}/cars`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au parc
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">Nouveau véhicule</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Car className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Nouveau véhicule</h1>
          <p className="text-sm text-gray-500">Renseignez les informations du véhicule</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identification */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Identification</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Immatriculation WW</label><input className="input" value={form.wwPlate} onChange={set('wwPlate')} placeholder="1234-WW-5" /></div>
            <div><label className="label">Immatriculation finale</label><input className="input" value={form.finalPlate} onChange={set('finalPlate')} placeholder="12345-A-1" /></div>
            <div><label className="label">Marque *</label><input className="input" value={form.brand} onChange={set('brand')} required /></div>
            <div><label className="label">Modèle *</label><input className="input" value={form.model} onChange={set('model')} required /></div>
          </div>
        </div>

        {/* Caractéristiques */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Caractéristiques</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Année</label><input className="input" type="number" value={form.year} onChange={set('year')} placeholder="2023" /></div>
            <div><label className="label">Couleur</label><input className="input" value={form.color} onChange={set('color')} placeholder="Blanc" /></div>
            <div>
              <label className="label">Carburant</label>
              <select className="input" value={form.fuelType} onChange={set('fuelType')}>
                <option value="">--</option>
                {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Boîte de vitesses</label>
              <select className="input" value={form.transmission} onChange={set('transmission')}>
                <option value="">--</option>
                {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Kilométrage</label><input className="input" type="number" value={form.mileage} onChange={set('mileage')} placeholder="0" /></div>
          </div>
        </div>

        {/* Tarification */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Tarification & Achat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Prix indicatif/jour TTC (MAD)</label><input className="input" type="number" step="0.01" value={form.rentalPriceTTC} onChange={set('rentalPriceTTC')} placeholder="0.00" /></div>
            <div><label className="label">Prix d'achat TTC (MAD)</label><input className="input" type="number" step="0.01" value={form.purchasePrice} onChange={set('purchasePrice')} placeholder="0.00" /></div>
            <div><label className="label">Date d'achat</label><input className="input" type="date" value={form.purchaseDate} onChange={set('purchaseDate')} /></div>
          </div>
        </div>

        {/* Documents & Dates */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Documents & Dates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date d'autorisation</label><input className="input" type="date" value={form.authorizationDate} onChange={set('authorizationDate')} /></div>
            <div><label className="label">Fin assurance</label><input className="input" type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} /></div>
            <div><label className="label">Dernier contrôle technique</label><input className="input" type="date" value={form.lastTechnicalInspection} onChange={set('lastTechnicalInspection')} /></div>
            <div><label className="label">Prochain contrôle technique</label><input className="input" type="date" value={form.nextTechnicalInspection} onChange={set('nextTechnicalInspection')} /></div>
            <div><label className="label">Fin autorisation de circulation</label><input className="input" type="date" value={form.circulationAuthExpiry} onChange={set('circulationAuthExpiry')} /></div>
          </div>
        </div>

        {/* Photos */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Photos</h3>
          <p className="text-xs text-gray-400">Cliquez sur <Star className="w-3 h-3 inline text-yellow-500" /> pour définir la photo principale affichée dans la liste.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={handlePhotoAdd}
          />
          {photoFiles.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photoFiles.map((file, idx) => (
                <div key={idx} className={`relative rounded-lg overflow-hidden border-2 aspect-square ${idx === mainPhotoIdx ? 'border-yellow-400' : 'border-gray-200'}`}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setMainPhotoIdx(idx)}
                    className={`absolute top-1 left-1 p-0.5 rounded-full ${idx === mainPhotoIdx ? 'bg-yellow-400 text-white' : 'bg-black/40 text-white hover:bg-yellow-400'}`}
                    title="Photo principale"
                  >
                    <Star className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/40 text-white hover:bg-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {idx === mainPhotoIdx && (
                    <span className="absolute bottom-0 left-0 right-0 bg-yellow-400/90 text-white text-[10px] text-center py-0.5 font-medium">Principale</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Camera className="w-4 h-4" /> Ajouter des photos
          </button>
        </div>

        {/* Notes */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Notes</h3>
          <textarea className="input min-h-[80px]" value={form.notes} onChange={set('notes')} placeholder="Informations complémentaires..." />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link to={`/agency/${agencyId}/cars`} className="btn-secondary flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Annuler
          </Link>
          <button type="submit" className="btn-primary flex items-center justify-center gap-2 px-6" disabled={isPending}>
            <Car className="w-4 h-4" />
            {uploading ? 'Upload photos...' : isPending ? 'Enregistrement...' : 'Créer le véhicule'}
          </button>
        </div>
      </form>
    </div>
  )
}
