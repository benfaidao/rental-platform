import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPricingSeasons, createPricingSeason, updatePricingSeason, deletePricingSeason,
  getPricingOptions, createPricingOption, updatePricingOption, deletePricingOption,
} from '../../api'
import { Plus, Pencil, Trash2, Tag, CalendarRange, Package, X, Check, TrendingUp, DollarSign, Repeat } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'
const fmtMoney = (n) => n != null ? `${Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD` : '-'

// ── Season Form ───────────────────────────────────────────────────────────────

function SeasonForm({ initial, onSave, onCancel, isPending }) {
  const [form, setForm] = useState(initial || {
    name: '', startDate: '', endDate: '', type: 'PERCENTAGE', value: '', isActive: true, isWeekendOnly: false,
  })
  const set = (k) => (e) => setForm(f => ({
    ...f,
    [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }))

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(form) }}
      className="card space-y-4 border border-blue-100 bg-blue-50/30"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label text-xs">Nom de la saison *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Ex. Haute saison été, Weekend..." required />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isWeekendOnly} onChange={set('isWeekendOnly')} className="w-4 h-4 rounded accent-purple-600" />
            <span className="text-sm font-medium text-purple-700">Tarif weekend récurrent (tous les samedis & dimanches)</span>
            <Repeat className="w-3.5 h-3.5 text-purple-500" />
          </label>
          {form.isWeekendOnly && (
            <p className="text-xs text-purple-600 mt-1 ml-6">Ce tarif s'applique automatiquement à tous les weekends, sans limites de dates.</p>
          )}
        </div>

        {!form.isWeekendOnly && (
          <>
            <div>
              <label className="label text-xs">Date de début *</label>
              <input className="input" type="date" value={form.startDate} onChange={set('startDate')} required />
            </div>
            <div>
              <label className="label text-xs">Date de fin *</label>
              <input className="input" type="date" value={form.endDate} min={form.startDate || undefined} onChange={set('endDate')} required />
            </div>
          </>
        )}

        <div>
          <label className="label text-xs">Type de tarification *</label>
          <select className="input" value={form.type} onChange={set('type')}>
            <option value="PERCENTAGE">Pourcentage (% sur le prix de base)</option>
            <option value="FIXED">Prix fixe (MAD/jour)</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">
            {form.type === 'PERCENTAGE' ? 'Pourcentage (%) *' : 'Prix journalier fixe (MAD) *'}
          </label>
          <div className="relative">
            <input
              className="input pr-12"
              type="number"
              step="0.01"
              min="0"
              value={form.value}
              onChange={set('value')}
              placeholder={form.type === 'PERCENTAGE' ? '20 pour +20%' : '500.00'}
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              {form.type === 'PERCENTAGE' ? '%' : 'MAD'}
            </span>
          </div>
          {form.type === 'PERCENTAGE' && parseFloat(form.value) > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              Un véhicule à 300 MAD/j coûtera {(300 * (1 + parseFloat(form.value) / 100)).toFixed(2)} MAD/j pendant cette période.
            </p>
          )}
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input type="checkbox" id="seasonActive" checked={form.isActive} onChange={set('isActive')} className="w-4 h-4 rounded" />
          <label htmlFor="seasonActive" className="text-sm text-gray-700 cursor-pointer">Saison active</label>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary text-sm py-1.5 flex items-center gap-1.5" disabled={isPending}>
          <Check className="w-3.5 h-3.5" /> {isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm py-1.5 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" /> Annuler
        </button>
      </div>
    </form>
  )
}

// ── Option Form ───────────────────────────────────────────────────────────────

function OptionForm({ initial, onSave, onCancel, isPending }) {
  const [form, setForm] = useState(initial || { name: '', pricePerDay: '', isActive: true })
  const set = (k) => (e) => setForm(f => ({
    ...f,
    [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }))

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(form) }}
      className="card space-y-4 border border-green-100 bg-green-50/30"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label text-xs">Nom de l'option *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Ex. Siège bébé, GPS, Conducteur..." required />
        </div>
        <div>
          <label className="label text-xs">Prix par jour (MAD) *</label>
          <input className="input" type="number" step="0.01" min="0" value={form.pricePerDay} onChange={set('pricePerDay')} placeholder="50.00" required />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="optionActive" checked={form.isActive} onChange={set('isActive')} className="w-4 h-4 rounded" />
          <label htmlFor="optionActive" className="text-sm text-gray-700 cursor-pointer">Option active</label>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary text-sm py-1.5 flex items-center gap-1.5" disabled={isPending}>
          <Check className="w-3.5 h-3.5" /> {isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm py-1.5 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" /> Annuler
        </button>
      </div>
    </form>
  )
}

// ── Seasons Tab ───────────────────────────────────────────────────────────────

function SeasonsTab({ agencyId }) {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const { data: seasons = [] } = useQuery({
    queryKey: ['pricingSeasons', agencyId],
    queryFn: () => getPricingSeasons(agencyId).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data) => createPricingSeason(agencyId, data),
    onSuccess: () => { qc.invalidateQueries(['pricingSeasons', agencyId]); setShowCreate(false); toast.success('Saison créée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updatePricingSeason(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['pricingSeasons', agencyId]); setEditingId(null); toast.success('Saison mise à jour') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => deletePricingSeason(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['pricingSeasons', agencyId]); toast.success('Saison supprimée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const toggleActive = (s) => updateMut.mutate({ id: s.id, data: { isActive: !s.isActive } })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">{seasons.length} saison(s) définie(s)</p>
        <button
          onClick={() => { setShowCreate(v => !v); setEditingId(null) }}
          className="btn-primary flex items-center justify-center gap-2 text-sm py-1.5 w-full sm:w-fit"
        >
          <Plus className="w-3.5 h-3.5" /> Nouvelle saison
        </button>
      </div>

      {showCreate && (
        <SeasonForm
          onSave={(data) => createMut.mutate(data)}
          onCancel={() => setShowCreate(false)}
          isPending={createMut.isPending}
        />
      )}

      <div className="space-y-3">
        {seasons.map(s => (
          <div key={s.id} className="card space-y-3 py-4 px-4">
            {editingId === s.id ? (
              <SeasonForm
                initial={{
                  name: s.name,
                  startDate: s.startDate ? s.startDate.split('T')[0] : '',
                  endDate: s.endDate ? s.endDate.split('T')[0] : '',
                  type: s.type,
                  value: s.value,
                  isActive: s.isActive,
                  isWeekendOnly: s.isWeekendOnly || false,
                }}
                onSave={(data) => updateMut.mutate({ id: s.id, data })}
                onCancel={() => setEditingId(null)}
                isPending={updateMut.isPending}
              />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{s.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {s.isWeekendOnly && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                        <Repeat className="w-3 h-3" /> Weekend
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.type === 'PERCENTAGE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {s.type === 'PERCENTAGE' ? (
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +{s.value}%</span>
                      ) : (
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {fmtMoney(s.value)}/j</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {s.isWeekendOnly ? 'Tous les weekends' : `${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${s.isActive ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                  >
                    {s.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                  <button onClick={() => { setEditingId(s.id); setShowCreate(false) }} className="p-1.5 hover:bg-blue-50 rounded text-blue-400">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Supprimer cette saison ?')) deleteMut.mutate(s.id) }}
                    className="p-1.5 hover:bg-red-50 rounded text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!seasons.length && !showCreate && (
          <div className="text-center py-12 text-gray-400">
            <CalendarRange className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucune saison définie</p>
            <p className="text-xs mt-1">Créez des saisons pour ajuster automatiquement les tarifs selon les périodes.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Options Tab ───────────────────────────────────────────────────────────────

function OptionsTab({ agencyId }) {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const { data: options = [] } = useQuery({
    queryKey: ['pricingOptions', agencyId],
    queryFn: () => getPricingOptions(agencyId).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data) => createPricingOption(agencyId, data),
    onSuccess: () => { qc.invalidateQueries(['pricingOptions', agencyId]); setShowCreate(false); toast.success('Option créée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updatePricingOption(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['pricingOptions', agencyId]); setEditingId(null); toast.success('Option mise à jour') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => deletePricingOption(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['pricingOptions', agencyId]); toast.success('Option supprimée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const toggleActive = (o) => updateMut.mutate({ id: o.id, data: { isActive: !o.isActive } })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">{options.length} option(s) disponible(s)</p>
        <button
          onClick={() => { setShowCreate(v => !v); setEditingId(null) }}
          className="btn-primary flex items-center justify-center gap-2 text-sm py-1.5 w-full sm:w-fit"
        >
          <Plus className="w-3.5 h-3.5" /> Nouvelle option
        </button>
      </div>

      {showCreate && (
        <OptionForm
          onSave={(data) => createMut.mutate(data)}
          onCancel={() => setShowCreate(false)}
          isPending={createMut.isPending}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map(o => (
          <div key={o.id} className="card py-3 px-4 space-y-3">
            {editingId === o.id ? (
              <OptionForm
                initial={{ name: o.name, pricePerDay: o.pricePerDay, isActive: o.isActive }}
                onSave={(data) => updateMut.mutate({ id: o.id, data })}
                onCancel={() => setEditingId(null)}
                isPending={updateMut.isPending}
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-4.5 h-4.5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-800 truncate">{o.name}</p>
                    {!o.isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 shrink-0">Inactif</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{fmtMoney(o.pricePerDay)} / jour</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleActive(o)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${o.isActive ? 'border-gray-200 text-gray-400 hover:bg-gray-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                  >
                    {o.isActive ? 'Off' : 'On'}
                  </button>
                  <button onClick={() => { setEditingId(o.id); setShowCreate(false) }} className="p-1.5 hover:bg-blue-50 rounded text-blue-400">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Supprimer cette option ?')) deleteMut.mutate(o.id) }}
                    className="p-1.5 hover:bg-red-50 rounded text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!options.length && !showCreate && (
          <div className="sm:col-span-2 text-center py-12 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucune option définie</p>
            <p className="text-xs mt-1">Ajoutez des options (siège bébé, GPS, conducteur...) pour les proposer lors des réservations.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Pricing() {
  const { agencyId } = useParams()
  const [tab, setTab] = useState('seasons')

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Tarification</h1>
            <p className="text-sm text-gray-500">Gérez les saisons tarifaires et les options de location</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('seasons')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === 'seasons' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-2"><CalendarRange className="w-4 h-4" /> Saisons</span>
        </button>
        <button
          onClick={() => setTab('options')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === 'options' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-2"><Package className="w-4 h-4" /> Options de location</span>
        </button>
      </div>

      {tab === 'seasons' && <SeasonsTab agencyId={agencyId} />}
      {tab === 'options' && <OptionsTab agencyId={agencyId} />}
    </div>
  )
}
