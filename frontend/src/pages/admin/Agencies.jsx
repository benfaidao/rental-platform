import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAgencies, createAgency, updateAgency, deleteAgency, getAgencyUsers, addAgencyUser, removeAgencyUser, getAdminAccess, createAdminAccess, deleteAdminAccess } from '../../api'
import Modal from '../../components/Modal'
import { Plus, Edit2, Trash2, Users, Check, X, Building2, Shield, ArrowRight, PauseCircle, PlayCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function AgencyForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(initial || { name: '', address: '', phone: '', email: '', ice: '', ic: '', rc: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={set('name')} required /></div>
      <div><label className="label">Adresse</label><input className="input" value={form.address} onChange={set('address')} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="label">ICE</label><input className="input" value={form.ice} onChange={set('ice')} /></div>
        <div><label className="label">IC</label><input className="input" value={form.ic} onChange={set('ic')} /></div>
        <div><label className="label">RC</label><input className="input" value={form.rc} onChange={set('rc')} /></div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}

function UserModal({ agency, onClose }) {
  const qc = useQueryClient()
  const [newUser, setNewUser] = useState({ email: '', firstName: '', lastName: '', phone: '', password: '', role: 'USER' })
  const [showForm, setShowForm] = useState(false)

  const { data: users = [] } = useQuery({
    queryKey: ['agencyUsers', agency.id],
    queryFn: () => getAgencyUsers(agency.id).then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (data) => addAgencyUser(agency.id, data),
    onSuccess: () => { qc.invalidateQueries(['agencyUsers', agency.id]); setShowForm(false); toast.success('Utilisateur ajouté') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId) => removeAgencyUser(agency.id, userId),
    onSuccess: () => { qc.invalidateQueries(['agencyUsers', agency.id]); toast.success('Utilisateur retiré') },
    onError: () => toast.error('Erreur'),
  })

  const set = (k) => (e) => setNewUser(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Membres de {agency.name}</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs py-1 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(newUser) }} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label text-xs">Prénom *</label><input className="input" value={newUser.firstName} onChange={set('firstName')} required /></div>
            <div><label className="label text-xs">Nom *</label><input className="input" value={newUser.lastName} onChange={set('lastName')} required /></div>
            <div><label className="label text-xs">Email *</label><input className="input" type="email" value={newUser.email} onChange={set('email')} required /></div>
            <div><label className="label text-xs">Téléphone</label><input className="input" value={newUser.phone} onChange={set('phone')} /></div>
            <div><label className="label text-xs">Mot de passe *</label><input className="input" type="password" value={newUser.password} onChange={set('password')} required /></div>
            <div>
              <label className="label text-xs">Rôle</label>
              <select className="input" value={newUser.role} onChange={set('role')}>
                <option value="USER">Utilisateur</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary text-xs py-1" disabled={addMutation.isPending}>Ajouter</button>
        </form>
      )}

      <div className="space-y-2">
        {users.map(au => (
          <div key={au.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium">{au.user.firstName} {au.user.lastName}</p>
              <p className="text-xs text-gray-500">{au.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${au.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {au.role === 'ADMIN' ? 'Admin' : 'Utilisateur'}
              </span>
              <button
                onClick={() => { if (confirm('Retirer cet utilisateur ?')) removeMutation.mutate(au.user.id) }}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {!users.length && <p className="text-sm text-gray-400 text-center py-4">Aucun membre</p>}
      </div>
    </div>
  )
}

// ─── Inter-agency Access Tab ──────────────────────────────────────────────────
function InterAgencyAccess({ agencies }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ giverAgencyId: '', receiverAgencyId: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: accesses = [], isLoading } = useQuery({
    queryKey: ['adminAccess'],
    queryFn: () => getAdminAccess().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: createAdminAccess,
    onSuccess: () => { qc.invalidateQueries(['adminAccess']); setForm({ giverAgencyId: '', receiverAgencyId: '' }); toast.success('Accès créé') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteAdminAccess,
    onSuccess: () => { qc.invalidateQueries(['adminAccess']); toast.success('Accès révoqué') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const existingPairs = new Set(accesses.map(a => `${a.giverAgencyId}-${a.receiverAgencyId}`))

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Créer un accès inter-agences
        </h3>
        <p className="text-sm text-gray-500">
          Choisissez quelle agence peut voir et réserver les voitures d'une autre agence.
          L'agence source pourra ensuite choisir si elle partage toutes ses voitures ou seulement certaines.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-40">
            <label className="label">Agence qui partage ses voitures *</label>
            <select className="input" value={form.giverAgencyId} onChange={set('giverAgencyId')} required>
              <option value="">Choisir…</option>
              {agencies.filter(a => a.isActive).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="pb-2 text-gray-400"><ArrowRight className="w-5 h-5" /></div>
          <div className="flex-1 min-w-40">
            <label className="label">Agence qui reçoit l'accès *</label>
            <select className="input" value={form.receiverAgencyId} onChange={set('receiverAgencyId')} required>
              <option value="">Choisir…</option>
              {agencies
                .filter(a => a.isActive && a.id !== form.giverAgencyId && !existingPairs.has(`${form.giverAgencyId}-${a.id}`))
                .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            Créer l'accès
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Accès existants ({accesses.length})</h3>
        {isLoading && <p className="text-center py-6 text-gray-400">Chargement...</p>}
        {accesses.map(a => (
          <div key={a.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{a.giverAgency?.name}</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-sm">{a.receiverAgency?.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${a.accessType === 'ALL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {a.accessType === 'ALL' ? 'Toutes les voitures' : `${a.carAccesses?.length || 0} voiture(s) spécifique(s)`}
              </span>
              <span className="text-xs text-gray-400">configuré par l'agence</span>
            </div>
            <button
              onClick={() => { if (confirm(`Révoquer l'accès de ${a.receiverAgency?.name} aux voitures de ${a.giverAgency?.name} ?`)) deleteMutation.mutate(a.id) }}
              className="p-1.5 hover:bg-red-50 rounded text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!isLoading && !accesses.length && (
          <div className="text-center py-10 text-gray-400">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Aucun accès inter-agences configuré</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Agencies() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('agencies')
  const [modal, setModal] = useState(null)
  const [usersModal, setUsersModal] = useState(null)

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => getAgencies().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: createAgency,
    onSuccess: () => { qc.invalidateQueries(['agencies']); setModal(null); toast.success('Agence créée') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAgency(id, data),
    onSuccess: () => { qc.invalidateQueries(['agencies']); setModal(null); toast.success('Agence mise à jour') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAgency,
    onSuccess: () => { qc.invalidateQueries(['agencies']); toast.success('Agence supprimée') },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, isSuspended }) => updateAgency(id, { isSuspended }),
    onSuccess: (_, { isSuspended }) => {
      qc.invalidateQueries(['agencies'])
      toast.success(isSuspended ? 'Agence suspendue' : 'Agence réactivée')
    },
    onError: () => toast.error('Erreur'),
  })

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[{ id: 'agencies', label: 'Agences' }, { id: 'access', label: 'Accès inter-agences' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'access' && <InterAgencyAccess agencies={agencies} />}

      {tab === 'agencies' && <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{agencies.length} agence(s)</p>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle Agence
        </button>
      </div>

      <div className="grid gap-4">
        {isLoading && <div className="text-center py-8 text-gray-400">Chargement...</div>}
        {agencies.map(agency => (
          <div key={agency.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold">
                {agency.name[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{agency.name}</h3>
                  <span className={agency.isActive ? 'badge-green' : 'badge-red'}>
                    {agency.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  {agency.isSuspended && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      Suspendue
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {agency._count?.cars || 0} véhicules · {agency._count?.contracts || 0} contrats · {agency._count?.agencyUsers || 0} membres
                </p>
                {agency.phone && <p className="text-xs text-gray-400">{agency.phone}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setUsersModal(agency)} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> Membres
              </button>
              <button
                onClick={() => {
                  const action = agency.isSuspended ? 'réactiver' : 'suspendre'
                  if (confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${agency.name}" ?`))
                    suspendMutation.mutate({ id: agency.id, isSuspended: !agency.isSuspended })
                }}
                className={`p-2 rounded-lg ${agency.isSuspended ? 'hover:bg-green-50 text-green-500' : 'hover:bg-orange-50 text-orange-400'}`}
                title={agency.isSuspended ? 'Réactiver' : 'Suspendre'}
              >
                {agency.isSuspended ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              </button>
              <button onClick={() => setModal({ type: 'edit', agency })} className="p-2 hover:bg-gray-100 rounded-lg">
                <Edit2 className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => { if (confirm(`Supprimer "${agency.name}" ?`)) deleteMutation.mutate(agency.id) }}
                className="p-2 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {!isLoading && !agencies.length && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune agence. Créez la première !</p>
          </div>
        )}
      </div>

      <Modal isOpen={modal?.type === 'create'} onClose={() => setModal(null)} title="Nouvelle Agence">
        <AgencyForm onSubmit={createMutation.mutate} loading={createMutation.isPending} />
      </Modal>

      <Modal isOpen={modal?.type === 'edit'} onClose={() => setModal(null)} title="Modifier l'Agence">
        {modal?.agency && (
          <AgencyForm
            initial={{
              ...modal.agency,
              ice: modal.agency.ice || '',
              ic: modal.agency.ic || '',
              rc: modal.agency.rc || '',
            }}
            onSubmit={(data) => updateMutation.mutate({ id: modal.agency.id, data })}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      <Modal isOpen={!!usersModal} onClose={() => setUsersModal(null)} title="Membres de l'Agence" size="lg">
        {usersModal && <UserModal agency={usersModal} onClose={() => setUsersModal(null)} />}
      </Modal>
      </>}
    </div>
  )
}
