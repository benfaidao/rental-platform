import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../../api'
import { ArrowLeft, UserPlus } from 'lucide-react'
import LicenseScanField from '../../components/LicenseScanField'
import toast from 'react-hot-toast'

const ID_TYPES = ['CIN', 'Passeport', 'Carte de séjour', 'Autre']

export default function NewClient() {
  const { agencyId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    clientType: 'INDIVIDUAL',
    firstName: '', lastName: '', companyName: '', companyIce: '',
    phone: '', email: '', address: '',
    idType: 'CIN', idNumber: '', idExpiry: '',
    licenseNumber: '', licenseExpiry: '',
  })
  const [idFiles, setIdFiles]           = useState([])
  const [licenseFiles, setLicenseFiles] = useState([])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const isCompany = form.clientType === 'COMPANY'

  const createMutation = useMutation({
    mutationFn: (fd) => createClient(agencyId, fd),
    onSuccess: () => {
      qc.invalidateQueries(['clients', agencyId])
      toast.success('Client ajouté')
      navigate(`/agency/${agencyId}/clients`)
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
    idFiles.forEach(f => fd.append('idFile', f))
    licenseFiles.forEach(f => fd.append('licenseFile', f))
    createMutation.mutate(fd)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          to={`/agency/${agencyId}/clients`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux clients
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">Nouveau client</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Nouveau client</h1>
          <p className="text-sm text-gray-500">Renseignez les informations du client</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Type de client</h3>
          <div className="flex gap-3">
            {[{ value: 'INDIVIDUAL', label: 'Particulier' }, { value: 'COMPANY', label: 'Entreprise' }].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, clientType: opt.value }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${form.clientType === opt.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entreprise */}
        {isCompany && (
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-700">Informations entreprise</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Raison sociale *</label>
                <input className="input" value={form.companyName} onChange={set('companyName')} required />
              </div>
              <div>
                <label className="label">ICE</label>
                <input className="input" placeholder="001234567000012" value={form.companyIce} onChange={set('companyIce')} />
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">{isCompany ? 'Contact / Représentant' : 'Informations personnelles'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Prénom *</label><input className="input" value={form.firstName} onChange={set('firstName')} required /></div>
            <div><label className="label">Nom *</label><input className="input" value={form.lastName} onChange={set('lastName')} required /></div>
            <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
            <div className="sm:col-span-2"><label className="label">Adresse</label><input className="input" value={form.address} onChange={set('address')} /></div>
          </div>
        </div>

        {/* Pièce d'identité */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Pièce d'identité</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.idType} onChange={set('idType')}>
                {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Numéro</label><input className="input" value={form.idNumber} onChange={set('idNumber')} /></div>
            <div><label className="label">Date d'expiration</label><input className="input" type="date" value={form.idExpiry} onChange={set('idExpiry')} /></div>
          </div>
          <LicenseScanField
            files={idFiles}
            onChange={setIdFiles}
            label="Photos / PDF (recto, verso…)"
          />
        </div>

        {/* Permis */}
        {!isCompany && (
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-700">Permis de conduire</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Numéro</label><input className="input" value={form.licenseNumber} onChange={set('licenseNumber')} /></div>
              <div><label className="label">Date d'expiration</label><input className="input" type="date" value={form.licenseExpiry} onChange={set('licenseExpiry')} /></div>
            </div>
            <LicenseScanField
              files={licenseFiles}
              onChange={setLicenseFiles}
              label="Photos / PDF (recto, verso…)"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link to={`/agency/${agencyId}/clients`} className="btn-secondary flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Annuler
          </Link>
          <button type="submit" className="btn-primary flex items-center justify-center gap-2 px-6" disabled={createMutation.isPending}>
            <UserPlus className="w-4 h-4" />
            {createMutation.isPending ? 'Enregistrement...' : 'Créer le client'}
          </button>
        </div>
      </form>
    </div>
  )
}
