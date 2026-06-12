import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCars, getOilChanges, createOilChange, updateOilChange, deleteOilChange,
  getTires, createTire, updateTire, deleteTire,
  getRepairs, createRepair, updateRepair, deleteRepair, uploadRepairPhotos, getFileUrl,
} from '../../api'
import Modal from '../../components/Modal'
import { Plus, Edit2, Trash2, Wrench, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'

function CarSelect({ cars, value, onChange }) {
  const [search, setSearch] = useState('')
  const filtered = cars.filter(c =>
    !search || `${c.brand} ${c.model} ${c.finalPlate || ''} ${c.wwPlate || ''}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <label className="label">Véhicule *</label>
      <input className="input mb-1" placeholder="Rechercher un véhicule..." value={search} onChange={e => setSearch(e.target.value)} />
      <select className="input" value={value} onChange={e => onChange(e.target.value)} required size={Math.min(filtered.length + 1, 6)}>
        <option value="">Choisir un véhicule</option>
        {filtered.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} — {c.finalPlate || c.wwPlate}</option>)}
      </select>
    </div>
  )
}

function CarFilter({ cars, value, onChange }) {
  const [search, setSearch] = useState('')
  const filtered = cars.filter(c =>
    !search || `${c.brand} ${c.model} ${c.finalPlate || ''} ${c.wwPlate || ''}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input
        className="input w-full sm:w-52"
        placeholder="Filtrer par véhicule..."
        value={search}
        onChange={e => { setSearch(e.target.value); if (!e.target.value) onChange('') }}
      />
      <select className="input w-full sm:w-52" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Tous les véhicules</option>
        {filtered.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} — {c.finalPlate || c.wwPlate}</option>)}
      </select>
    </div>
  )
}

// --- Oil Changes Tab ---
function OilChanges({ agencyId, cars }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [carFilter, setCarFilter] = useState('')
  const [form, setForm] = useState({ carId: '', date: '', mileage: '', oilType: '', filterChanged: false, cost: '', notes: '', nextKm: '', nextDate: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const { data: records = [] } = useQuery({
    queryKey: ['oilChanges', agencyId, carFilter],
    queryFn: () => getOilChanges(agencyId, carFilter ? { carId: carFilter } : {}).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => createOilChange(agencyId, data),
    onSuccess: () => { qc.invalidateQueries(['oilChanges', agencyId]); setModal(null); toast.success('Vidange ajoutée') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateOilChange(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['oilChanges', agencyId]); setModal(null); toast.success('Mis à jour') },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteOilChange(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['oilChanges', agencyId]); toast.success('Supprimé') },
  })

  const submitForm = (e) => { e.preventDefault(); modal?.record ? updateMutation.mutate({ id: modal.record.id, data: form }) : createMutation.mutate(form) }
  const openEdit = (r) => { setForm({ ...r, date: r.date?.split('T')[0], nextDate: r.nextDate?.split('T')[0] || '' }); setModal({ record: r }) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <CarFilter cars={cars} value={carFilter} onChange={setCarFilter} />
        <button
          onClick={() => { setForm({ carId: '', date: '', mileage: '', oilType: '', filterChanged: false, cost: '', notes: '', nextKm: '', nextDate: '' }); setModal({ record: null }) }}
          className="btn-primary flex items-center gap-2 w-full sm:w-fit justify-center shrink-0"
        >
          <Plus className="w-4 h-4" /> Nouvelle Vidange
        </button>
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-3">
        {records.map(r => (
          <div key={r.id} className="card p-4 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{r.car?.brand} {r.car?.model}</p>
                <p className="text-xs text-gray-400">{r.car?.finalPlate || r.car?.wwPlate}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(r.id) }} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-600">
              <span>{fmtDate(r.date)}</span>
              {r.mileage && <span>{r.mileage.toLocaleString()} km</span>}
              {r.oilType && <span>{r.oilType}</span>}
              {r.cost && <span>{r.cost} MAD</span>}
              <span>{r.filterChanged ? '✓ Filtre changé' : '✗ Filtre'}</span>
            </div>
            {(r.nextDate || r.nextKm) && (
              <p className="text-xs text-orange-600">
                Prochaine : {r.nextDate ? fmtDate(r.nextDate) : `${r.nextKm?.toLocaleString()} km`}
              </p>
            )}
          </div>
        ))}
        {!records.length && <p className="text-center py-8 text-gray-400">Aucune vidange</p>}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-xl shadow-sm border border-gray-100">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Véhicule', 'Date', 'Km', 'Huile', 'Filtre', 'Coût', 'Prochaine', ''].map(h => <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{r.car?.brand} {r.car?.model}<br /><span className="text-xs text-gray-400">{r.car?.finalPlate || r.car?.wwPlate}</span></td>
                <td className="py-3 px-4">{fmtDate(r.date)}</td>
                <td className="py-3 px-4">{r.mileage?.toLocaleString()}</td>
                <td className="py-3 px-4 text-gray-500">{r.oilType || '-'}</td>
                <td className="py-3 px-4">{r.filterChanged ? '✓' : '✗'}</td>
                <td className="py-3 px-4">{r.cost ? `${r.cost} MAD` : '-'}</td>
                <td className="py-3 px-4 text-gray-500">{r.nextDate ? fmtDate(r.nextDate) : r.nextKm ? `${r.nextKm?.toLocaleString()} km` : '-'}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(r.id) }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!records.length && <tr><td colSpan={8} className="py-8 text-center text-gray-400">Aucune vidange</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.record ? 'Modifier Vidange' : 'Nouvelle Vidange'}>
        <form onSubmit={submitForm} className="space-y-4">
          {!modal?.record && <CarSelect cars={cars} value={form.carId} onChange={v => setForm(f => ({ ...f, carId: v }))} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date *</label><input className="input" type="date" value={form.date} onChange={set('date')} required /></div>
            <div><label className="label">Kilométrage *</label><input className="input" type="number" value={form.mileage} onChange={set('mileage')} required /></div>
            <div><label className="label">Type d'huile</label><input className="input" value={form.oilType} onChange={set('oilType')} /></div>
            <div><label className="label">Coût (MAD)</label><input className="input" type="number" value={form.cost} onChange={set('cost')} /></div>
            <div><label className="label">Prochain km</label><input className="input" type="number" value={form.nextKm} onChange={set('nextKm')} /></div>
            <div><label className="label">Prochaine date</label><input className="input" type="date" value={form.nextDate} onChange={set('nextDate')} /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.filterChanged} onChange={set('filterChanged')} /><span className="text-sm">Filtre changé</span></label>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary w-full sm:w-fit justify-center" disabled={createMutation.isPending || updateMutation.isPending}>Enregistrer</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// --- Tires Tab ---
function Tires({ agencyId, cars }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [carFilter, setCarFilter] = useState('')
  const [form, setForm] = useState({ carId: '', date: '', mileage: '', position: '', brand: '', size: '', cost: '', notes: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: records = [] } = useQuery({
    queryKey: ['tires', agencyId, carFilter],
    queryFn: () => getTires(agencyId, carFilter ? { carId: carFilter } : {}).then(r => r.data),
  })

  const createMutation = useMutation({ mutationFn: (d) => createTire(agencyId, d), onSuccess: () => { qc.invalidateQueries(['tires', agencyId]); setModal(null); toast.success('Ajouté') } })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateTire(agencyId, id, data), onSuccess: () => { qc.invalidateQueries(['tires', agencyId]); setModal(null); toast.success('Mis à jour') } })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteTire(agencyId, id), onSuccess: () => { qc.invalidateQueries(['tires', agencyId]); toast.success('Supprimé') } })

  const submitForm = (e) => { e.preventDefault(); modal?.record ? updateMutation.mutate({ id: modal.record.id, data: form }) : createMutation.mutate(form) }
  const POSITIONS = ['AV-GAUCHE', 'AV-DROIT', 'AR-GAUCHE', 'AR-DROIT', 'ROUE-DE-SECOURS', 'TOUS']

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <select className="input w-full sm:w-56" value={carFilter} onChange={e => setCarFilter(e.target.value)}>
          <option value="">Tous les véhicules</option>
          {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} — {c.finalPlate || c.wwPlate}</option>)}
        </select>
        <button
          onClick={() => { setForm({ carId: '', date: '', mileage: '', position: '', brand: '', size: '', cost: '', notes: '' }); setModal({ record: null }) }}
          className="btn-primary flex items-center gap-2 w-full sm:w-fit justify-center shrink-0"
        >
          <Plus className="w-4 h-4" /> Nouveau Pneu
        </button>
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-3">
        {records.map(r => (
          <div key={r.id} className="card p-4 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{r.car?.brand} {r.car?.model}</p>
                <p className="text-xs text-gray-400">{r.car?.finalPlate || r.car?.wwPlate}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setForm({ ...r, date: r.date?.split('T')[0] }); setModal({ record: r }) }} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(r.id) }} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-600">
              <span>{fmtDate(r.date)}</span>
              {r.position && <span>{r.position}</span>}
              {r.brand && <span>{r.brand}</span>}
              {r.size && <span>{r.size}</span>}
              {r.cost && <span>{r.cost} MAD</span>}
            </div>
          </div>
        ))}
        {!records.length && <p className="text-center py-8 text-gray-400">Aucun enregistrement pneu</p>}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-xl shadow-sm border border-gray-100">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Véhicule', 'Date', 'Position', 'Marque', 'Taille', 'Coût TTC', ''].map(h => <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{r.car?.brand} {r.car?.model}</td>
                <td className="py-3 px-4">{fmtDate(r.date)}</td>
                <td className="py-3 px-4 text-gray-500">{r.position || '-'}</td>
                <td className="py-3 px-4 text-gray-500">{r.brand || '-'}</td>
                <td className="py-3 px-4 text-gray-500">{r.size || '-'}</td>
                <td className="py-3 px-4">{r.cost ? `${r.cost} MAD` : '-'}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button onClick={() => { setForm({ ...r, date: r.date?.split('T')[0] }); setModal({ record: r }) }} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(r.id) }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!records.length && <tr><td colSpan={7} className="py-8 text-center text-gray-400">Aucun enregistrement pneu</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.record ? 'Modifier Pneu' : 'Nouveau Pneu'}>
        <form onSubmit={submitForm} className="space-y-4">
          {!modal?.record && <CarSelect cars={cars} value={form.carId} onChange={v => setForm(f => ({ ...f, carId: v }))} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date *</label><input className="input" type="date" value={form.date} onChange={set('date')} required /></div>
            <div><label className="label">Kilométrage</label><input className="input" type="number" value={form.mileage} onChange={set('mileage')} /></div>
            <div><label className="label">Position</label><select className="input" value={form.position} onChange={set('position')}><option value="">--</option>{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="label">Marque pneu</label><input className="input" value={form.brand} onChange={set('brand')} /></div>
            <div><label className="label">Taille</label><input className="input" placeholder="Ex: 205/55R16" value={form.size} onChange={set('size')} /></div>
            <div><label className="label">Coût TTC</label><input className="input" type="number" value={form.cost} onChange={set('cost')} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary w-full sm:w-fit justify-center">Enregistrer</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// --- Repairs Tab ---
function Repairs({ agencyId, cars }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [carFilter, setCarFilter] = useState('')
  const [form, setForm] = useState({ carId: '', date: '', description: '', mileage: '', cost: '', garage: '', nextRepairDate: '', nextRepairDescription: '', notes: '' })
  const [photoFiles, setPhotoFiles] = useState([])
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: records = [] } = useQuery({
    queryKey: ['repairs', agencyId, carFilter],
    queryFn: () => getRepairs(agencyId, carFilter ? { carId: carFilter } : {}).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const r = await createRepair(agencyId, data)
      if (photoFiles.length > 0) {
        const fd = new FormData()
        photoFiles.forEach(f => fd.append('photos', f))
        await uploadRepairPhotos(agencyId, r.data.id, fd)
      }
    },
    onSuccess: () => { qc.invalidateQueries(['repairs', agencyId]); setModal(null); toast.success('Réparation ajoutée') },
    onError: () => toast.error('Erreur'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateRepair(agencyId, id, data),
    onSuccess: () => { qc.invalidateQueries(['repairs', agencyId]); setModal(null); toast.success('Mis à jour') },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteRepair(agencyId, id),
    onSuccess: () => { qc.invalidateQueries(['repairs', agencyId]); toast.success('Supprimé') },
  })

  const submitForm = (e) => { e.preventDefault(); modal?.record ? updateMutation.mutate({ id: modal.record.id, data: form }) : createMutation.mutate(form) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <CarFilter cars={cars} value={carFilter} onChange={setCarFilter} />
        <button
          onClick={() => { setForm({ carId: '', date: '', description: '', mileage: '', cost: '', garage: '', nextRepairDate: '', nextRepairDescription: '', notes: '' }); setPhotoFiles([]); setModal({ record: null }) }}
          className="btn-primary flex items-center gap-2 w-full sm:w-fit justify-center shrink-0"
        >
          <Plus className="w-4 h-4" /> Nouvelle Réparation
        </button>
      </div>
      <div className="space-y-3">
        {records.map(r => (
          <div key={r.id} className="card p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h4 className="font-medium">{r.car?.brand} {r.car?.model}</h4>
                  <span className="text-xs text-gray-400">{r.car?.finalPlate || r.car?.wwPlate}</span>
                  <span className="text-xs text-gray-500">{fmtDate(r.date)}</span>
                </div>
                <p className="text-sm mt-1">{r.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                  {r.mileage && <span>{r.mileage.toLocaleString()} km</span>}
                  {r.cost && <span>{r.cost} MAD</span>}
                  {r.garage && <span>Garage : {r.garage}</span>}
                </div>
                {r.nextRepairDate && (
                  <p className="text-xs text-orange-600 mt-1">
                    Prochaine : {r.nextRepairDescription} le {fmtDate(r.nextRepairDate)}
                  </p>
                )}
                {r.photos?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.photos.map(p => <img key={p.id} src={getFileUrl(p.url, agencyId)} alt="" className="w-12 h-12 object-cover rounded" />)}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setForm({ ...r, date: r.date?.split('T')[0], nextRepairDate: r.nextRepairDate?.split('T')[0] || '' }); setModal({ record: r }) }} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(r.id) }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
          </div>
        ))}
        {!records.length && (
          <div className="text-center py-12 text-gray-400">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune réparation enregistrée</p>
          </div>
        )}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.record ? 'Modifier Réparation' : 'Nouvelle Réparation'} size="lg">
        <form onSubmit={submitForm} className="space-y-4">
          {!modal?.record && <CarSelect cars={cars} value={form.carId} onChange={v => setForm(f => ({ ...f, carId: v }))} />}
          <div><label className="label">Description *</label><input className="input" value={form.description} onChange={set('description')} required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date *</label><input className="input" type="date" value={form.date} onChange={set('date')} required /></div>
            <div><label className="label">Kilométrage</label><input className="input" type="number" value={form.mileage} onChange={set('mileage')} /></div>
            <div><label className="label">Coût (MAD)</label><input className="input" type="number" value={form.cost} onChange={set('cost')} /></div>
            <div><label className="label">Garage</label><input className="input" value={form.garage} onChange={set('garage')} /></div>
            <div><label className="label">Prochaine réparation</label><input className="input" value={form.nextRepairDescription} onChange={set('nextRepairDescription')} /></div>
            <div><label className="label">Date prochaine</label><input className="input" type="date" value={form.nextRepairDate} onChange={set('nextRepairDate')} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
          {!modal?.record && (
            <div>
              <label className="label">Photos (optionnel)</label>
              <input type="file" multiple accept="image/*" className="input" onChange={e => setPhotoFiles(Array.from(e.target.files))} />
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary w-full sm:w-fit justify-center">Enregistrer</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default function Maintenance() {
  const { agencyId } = useParams()
  const [tab, setTab] = useState('oil')
  const { data: cars = [] } = useQuery({ queryKey: ['cars', agencyId], queryFn: () => getCars(agencyId).then(r => r.data) })

  const tabs = [
    { id: 'oil', label: 'Vidanges' },
    { id: 'tires', label: 'Pneus' },
    { id: 'repairs', label: 'Réparations' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'oil' && <OilChanges agencyId={agencyId} cars={cars} />}
      {tab === 'tires' && <Tires agencyId={agencyId} cars={cars} />}
      {tab === 'repairs' && <Repairs agencyId={agencyId} cars={cars} />}
    </div>
  )
}
