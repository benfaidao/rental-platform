import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCar, updateCar } from '../../api'
import { ArrowLeft, Car } from 'lucide-react'
import toast from 'react-hot-toast'

const FUEL_TYPES = ['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL']
const TRANSMISSIONS = ['Manuelle', 'Automatique']

const toDate = (v) => v ? v.split('T')[0] : ''

export default function EditCar() {
  const { agencyId, carId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: car, isLoading } = useQuery({
    queryKey: ['carDetail', agencyId, carId],
    queryFn: () => getCar(agencyId, carId).then(r => r.data),
  })

  const [form, setForm] = useState(null)

  useEffect(() => {
    if (car) {
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
        rentalPriceTTC:           car.rentalPriceTTC           ?? '',
        purchasePrice:            car.purchasePrice            ?? '',
        purchaseDate:             toDate(car.purchaseDate),
        authorizationDate:        toDate(car.authorizationDate),
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
    onSuccess: () => {
      qc.invalidateQueries(['cars', agencyId])
      qc.invalidateQueries(['carDetail', agencyId, carId])
      toast.success('Véhicule mis à jour')
      navigate(`/agency/${agencyId}/cars/${carId}`)
    },
    onError: () => toast.error('Erreur'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  if (isLoading || !form) {
    return <div className="text-center py-16 text-gray-400">Chargement...</div>
  }

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
          <button type="submit" className="btn-primary flex items-center justify-center gap-2 px-6" disabled={updateMutation.isPending}>
            <Car className="w-4 h-4" />
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  )
}
