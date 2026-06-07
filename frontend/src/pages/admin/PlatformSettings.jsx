import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlatformSettings, updatePlatformSettings } from '../../api'
import { Building2, MapPin, Hash, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PlatformSettings() {
  const qc = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: ['platformSettings'],
    queryFn: () => getPlatformSettings().then(r => r.data),
  })

  const [form, setForm] = useState({ companyName: '', address: '', ice: '', ic: '', rc: '' })

  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName || '',
        address:     settings.address     || '',
        ice:         settings.ice         || '',
        ic:          settings.ic          || '',
        rc:          settings.rc          || '',
      })
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: (data) => updatePlatformSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platformSettings'] })
      toast.success('Informations enregistrées')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Paramètres de la plateforme</h1>
        <p className="text-sm text-gray-500 mt-1">Informations légales de la société qui exploite la plateforme.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="card space-y-5">
        <div>
          <label className="label flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" /> Nom de la société
          </label>
          <input
            className="input"
            value={form.companyName}
            onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
            placeholder="Nom de la société"
          />
        </div>

        <div>
          <label className="label flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" /> Adresse
          </label>
          <input
            className="input"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Adresse complète"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" /> ICE
            </label>
            <input
              className="input"
              value={form.ice}
              onChange={e => setForm(f => ({ ...f, ice: e.target.value }))}
              placeholder="000000000000000"
              maxLength={15}
            />
          </div>
          <div>
            <label className="label flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" /> IC
            </label>
            <input
              className="input"
              value={form.ic}
              onChange={e => setForm(f => ({ ...f, ic: e.target.value }))}
              placeholder="Identifiant commercial"
            />
          </div>
          <div>
            <label className="label flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" /> RC
            </label>
            <input
              className="input"
              value={form.rc}
              onChange={e => setForm(f => ({ ...f, rc: e.target.value }))}
              placeholder="Registre de commerce"
            />
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={mutation.isPending}>
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
