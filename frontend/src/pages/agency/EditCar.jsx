import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCar, updateCar, getCarDocuments, uploadCarDocument, deleteCarDocument, setCarPhotoAsMain, getFileUrl, getPartners } from '../../api'
import { ArrowLeft, Car, Camera, X, Star, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const FUEL_TYPES = ['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL']
const TRANSMISSIONS = ['Manuelle', 'Automatique']

const toDate = (v) => v ? v.split('T')[0] : ''

export default function EditCar() {
  const { agencyId, carId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInputRef = useRef(null)

  const { data: car, isLoading } = useQuery({
    queryKey: ['carDetail', agencyId, carId],
    queryFn: () => getCar(agencyId, carId).then(r => r.data),
  })

  const { data: allDocs = [] } = useQuery({
    queryKey: ['carDocs', carId],
    queryFn: () => getCarDocuments(agencyId, carId).then(r => r.data),
  })

  const photos = allDocs.filter(d => d.type === 'PHOTO')

  const [form, setForm] = useState(null)
  const [vendorSearch, setVendorSearch] = useState('')
  const [vendorName, setVendorName] = useState('')
  const { data: partners = [] } = useQuery({
    queryKey: ['partners', agencyId, vendorSearch],
    queryFn: () => getPartners(agencyId, vendorSearch ? { search: vendorSearch } : {}).then(r => r.data),
    enabled: vendorSearch.length > 0,
  })
  const [newPhotoFiles, setNewPhotoFiles] = useState([])
  const [mainNewPhotoIdx, setMainNewPhotoIdx] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (car) {
      if (car.vendor) setVendorName(car.vendor.name)
      setForm({
        wwPlate:                  car.wwPlate                  || '',
        finalPlate:               car.finalPlate               || '',
        brand:                    car.brand                    || '',
        model:                    car.model                    || '',
        year:                     car.year                     ?? '',
        color:                    car.color                    || '',
        fuelType:                 car.fuelType                 || '',
        mileage:                  car.mileage                  ?? '',
        transmission:             car.transmission             || '',
        fiscalPower:              car.fiscalPower              ?? '',
        chassisNumber:            car.chassisNumber            || '',
        cylindersCount:           car.cylindersCount           ?? '',
        vehicleType:              car.vehicleType              || '',
        genre:                    car.genre                    || '',
        vendorId:                 car.vendorId                 || '',
        rentalPriceTTC:           car.rentalPriceTTC           ?? '',
        purchasePrice:            car.purchasePrice            ?? '',
        purchaseDate:             toDate(car.purchaseDate),
        authorizationDate:            toDate(car.authorizationDate),
        definitiveAuthorizationDate:  toDate(car.definitiveAuthorizationDate),
        firstCirculationDate:         toDate(car.firstCirculationDate),
        insuranceExpiry:          toDate(car.insuranceExpiry),
        lastTechnicalInspection:  toDate(car.lastTechnicalInspection),
        nextTechnicalInspection:  toDate(car.nextTechnicalInspection),
        circulationAuthExpiry:    toDate(car.circulationAuthExpiry),
        notes:                    car.notes                    || '',
      })
    }
  }, [car])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const updateMutation = useMutation({
    mutationFn: (data) => updateCar(agencyId, carId, data),
    onSuccess: async () => {
      if (newPhotoFiles.length > 0) {
        setUploading(true)
        try {
          for (let i = 0; i < newPhotoFiles.length; i++) {
            const fd = new FormData()
            fd.append('file', newPhotoFiles[i])
            fd.append('type', 'PHOTO')
            if (i === mainNewPhotoIdx) fd.append('isMainPhoto', 'true')
            await uploadCarDocument(agencyId, carId, fd)
          }
          qc.invalidateQueries(['carDocs', carId])
        } catch {
          toast.error('Erreur lors de l\'upload de certaines photos')
        } finally {
          setUploading(false)
          setNewPhotoFiles([])
          setMainNewPhotoIdx(null)
        }
      }
      qc.invalidateQueries(['cars', agencyId])
      qc.invalidateQueries(['carDetail', agencyId, carId])
      toast.success('Véhicule mis à jour')
      navigate(`/agency/${agencyId}/cars/${carId}`)
    },
    onError: () => toast.error('Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (docId) => deleteCarDocument(agencyId, carId, docId),
    onSuccess: () => { qc.invalidateQueries(['carDocs', carId]); qc.invalidateQueries(['cars', agencyId]); toast.success('Photo supprimée') },
  })

  const mainMutation = useMutation({
    mutationFn: (docId) => setCarPhotoAsMain(agencyId, carId, docId),
    onSuccess: () => { qc.invalidateQueries(['carDocs', carId]); qc.invalidateQueries(['cars', agencyId]); toast.success('Photo principale définie') },
  })

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setNewPhotoFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  if (isLoading || !form) {
    return <div className="text-center py-16 text-gray-400">Chargement...</div>
  }

  const isPending = updateMutation.isPending || uploading

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          to={`/agency/${agencyId}/cars/${carId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la fiche
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">Modifier le véhicule</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Car className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{car.brand} {car.model}</h1>
          <p className="text-sm text-gray-500">
            {car.finalPlate || car.wwPlate || ''}{car.year ? ` · ${car.year}` : ''}
          </p>
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
            <div className="sm:col-span-2"><label className="label">Numéro de châssis</label><input className="input" value={form.chassisNumber} onChange={set('chassisNumber')} placeholder="VF1AA000000000000" /></div>
          </div>
        </div>

        {/* Caractéristiques */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Caractéristiques</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Année</label><input className="input" type="number" value={form.year} onChange={set('year')} placeholder="2023" /></div>
            <div><label className="label">Couleur</label><input className="input" value={form.color} onChange={set('color')} /></div>
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
            <div><label className="label">Kilométrage</label><input className="input" type="number" value={form.mileage} onChange={set('mileage')} /></div>
            <div><label className="label">Puissance fiscale (CV)</label><input className="input" type="number" value={form.fiscalPower} onChange={set('fiscalPower')} placeholder="ex: 7" /></div>
            <div><label className="label">Nombre de cylindres</label><input className="input" type="number" value={form.cylindersCount} onChange={set('cylindersCount')} placeholder="ex: 4" /></div>
            <div><label className="label">Type</label><input className="input" value={form.vehicleType} onChange={set('vehicleType')} placeholder="ex: BERLINE" /></div>
            <div><label className="label">Genre</label><input className="input" value={form.genre} onChange={set('genre')} placeholder="ex: VP" /></div>
          </div>
        </div>

        {/* Tarification */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Tarification & Achat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Prix indicatif/jour TTC (MAD)</label><input className="input" type="number" step="0.01" value={form.rentalPriceTTC} onChange={set('rentalPriceTTC')} placeholder="0.00" /></div>
            <div><label className="label">Prix d'achat TTC (MAD)</label><input className="input" type="number" step="0.01" value={form.purchasePrice} onChange={set('purchasePrice')} placeholder="0.00" /></div>
            <div><label className="label">Date d'achat</label><input className="input" type="date" value={form.purchaseDate} onChange={set('purchaseDate')} /></div>
            <div className="relative">
              <label className="label">Vendeur (partenaire)</label>
              {form.vendorId ? (
                <div className="input flex items-center justify-between">
                  <span className="text-gray-800">{vendorName}</span>
                  <button type="button" onClick={() => { setForm(f => ({ ...f, vendorId: '' })); setVendorName(''); setVendorSearch('') }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <input className="input" value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} placeholder="Rechercher un partenaire..." />
                  {partners.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {partners.map(p => (
                        <li key={p.id} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700" onClick={() => { setForm(f => ({ ...f, vendorId: p.id })); setVendorName(p.name); setVendorSearch('') }}>
                          {p.name}{p.type ? ` · ${p.type}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Documents & Dates */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Documents & Dates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date d'autorisation provisoire de circulation</label><input className="input" type="date" value={form.authorizationDate} onChange={set('authorizationDate')} /></div>
            <div><label className="label">Date d'autorisation définitive de circulation</label><input className="input" type="date" value={form.definitiveAuthorizationDate} onChange={set('definitiveAuthorizationDate')} /></div>
            <div><label className="label">Date de mise en circulation</label><input className="input" type="date" value={form.firstCirculationDate} onChange={set('firstCirculationDate')} /></div>
            <div><label className="label">Fin assurance</label><input className="input" type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} /></div>
            <div><label className="label">Dernier contrôle technique</label><input className="input" type="date" value={form.lastTechnicalInspection} onChange={set('lastTechnicalInspection')} /></div>
            <div><label className="label">Prochain contrôle technique</label><input className="input" type="date" value={form.nextTechnicalInspection} onChange={set('nextTechnicalInspection')} /></div>
            <div><label className="label">Fin autorisation de circulation</label><input className="input" type="date" value={form.circulationAuthExpiry} onChange={set('circulationAuthExpiry')} /></div>
          </div>
        </div>

        {/* Photos */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Photos</h3>
          <p className="text-xs text-gray-400">Cliquez sur <Star className="w-3 h-3 inline text-yellow-500" /> pour définir la photo principale affichée dans la liste des véhicules.</p>

          {/* Existing photos */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map(doc => (
                <div key={doc.id} className={`relative rounded-lg overflow-hidden border-2 aspect-square ${doc.isMainPhoto ? 'border-yellow-400' : 'border-gray-200'}`}>
                  <img
                    src={getFileUrl(doc.url, agencyId)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => mainMutation.mutate(doc.id)}
                    className={`absolute top-1 left-1 p-0.5 rounded-full ${doc.isMainPhoto ? 'bg-yellow-400 text-white' : 'bg-black/40 text-white hover:bg-yellow-400'}`}
                    title="Définir comme photo principale"
                    disabled={mainMutation.isPending}
                  >
                    <Star className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm('Supprimer cette photo ?')) deleteMutation.mutate(doc.id) }}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/40 text-white hover:bg-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {doc.isMainPhoto && (
                    <span className="absolute bottom-0 left-0 right-0 bg-yellow-400/90 text-white text-[10px] text-center py-0.5 font-medium">Principale</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* New photos to upload */}
          {newPhotoFiles.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Photos à ajouter ({newPhotoFiles.length}) — cliquez sur <Star className="w-3 h-3 inline text-yellow-500" /> pour définir la principale</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {newPhotoFiles.map((file, idx) => (
                  <div key={idx} className={`relative rounded-lg overflow-hidden border-2 aspect-square ${idx === mainNewPhotoIdx ? 'border-yellow-400' : 'border-blue-200'}`}>
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMainNewPhotoIdx(prev => prev === idx ? null : idx)}
                      className={`absolute top-1 left-1 p-0.5 rounded-full ${idx === mainNewPhotoIdx ? 'bg-yellow-400 text-white' : 'bg-black/40 text-white hover:bg-yellow-400'}`}
                      title="Définir comme photo principale"
                    >
                      <Star className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPhotoFiles(prev => prev.filter((_, i) => i !== idx))
                        setMainNewPhotoIdx(prev => {
                          if (prev === idx) return null
                          if (prev !== null && prev > idx) return prev - 1
                          return prev
                        })
                      }}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/40 text-white hover:bg-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {idx === mainNewPhotoIdx && (
                      <span className="absolute bottom-0 left-0 right-0 bg-yellow-400/90 text-white text-[10px] text-center py-0.5 font-medium">Principale</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={handlePhotoAdd}
          />
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
          <Link to={`/agency/${agencyId}/cars/${carId}`} className="btn-secondary flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Annuler
          </Link>
          <button type="submit" className="btn-primary flex items-center justify-center gap-2 px-6" disabled={isPending}>
            <Car className="w-4 h-4" />
            {uploading ? 'Upload photos...' : isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  )
}
