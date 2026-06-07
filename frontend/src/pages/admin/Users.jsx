import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deleteUser, getAgencies } from '../../api'
import Modal from '../../components/Modal'
import { Plus, Edit2, Trash2, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

function UserForm({ initial, onSubmit, loading, agencies = [] }) {
  const [form, setForm] = useState(initial || { email: '', firstName: '', lastName: '', phone: '', password: '', role: 'AGENCY_USER', agencyId: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Prénom *</label><input className="input" value={form.firstName} onChange={set('firstName')} required /></div>
        <div><label className="label">Nom *</label><input className="input" value={form.lastName} onChange={set('lastName')} required /></div>
        <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={set('email')} required disabled={!!initial} /></div>
        <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
        <div><label className="label">{initial ? 'Nouveau mot de passe' : 'Mot de passe *'}</label><input className="input" type="password" value={form.password} onChange={set('password')} required={!initial} /></div>
        <div>
          <label className="label">Rôle</label>
          <select className="input" value={form.role} onChange={set('role')}>
            <option value="AGENCY_USER">Utilisateur Agence</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
        {!initial && (
          <div className="col-span-2">
            <label className="label">Attacher à une agence</label>
            <select className="input" value={form.agencyId} onChange={set('agencyId')}>
              <option value="">-- Aucune --</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}

export default function Users() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers().then(r => r.data),
  })

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => getAgencies().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries(['users']); setModal(null); toast.success('Utilisateur créé') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries(['users']); setModal(null); toast.success('Mis à jour') },
    onError: () => toast.error('Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('Supprimé') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const ROLE_LABELS = { SUPER_ADMIN: 'Super Admin', AGENCY_USER: 'Utilisateur' }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvel Utilisateur
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Nom', 'Email', 'Téléphone', 'Rôle', 'Agences', 'Statut', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="py-8 text-center text-gray-400">Chargement...</td></tr>}
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{u.firstName} {u.lastName}</td>
                <td className="py-3 px-4 text-gray-600">{u.email}</td>
                <td className="py-3 px-4 text-gray-500">{u.phone || '-'}</td>
                <td className="py-3 px-4">
                  <span className={u.role === 'SUPER_ADMIN' ? 'badge-blue' : 'badge-gray'}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500">{u.agencyUsers?.map(au => au.agency.name).join(', ') || '-'}</td>
                <td className="py-3 px-4">
                  <span className={u.isActive ? 'badge-green' : 'badge-red'}>{u.isActive ? 'Actif' : 'Inactif'}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ type: 'edit', user: u })} className="p-1 hover:bg-gray-100 rounded">
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(u.id) }} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !users.length && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Aucun utilisateur</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal?.type === 'create'} onClose={() => setModal(null)} title="Nouvel Utilisateur">
        <UserForm onSubmit={createMutation.mutate} loading={createMutation.isPending} agencies={agencies} />
      </Modal>
      <Modal isOpen={modal?.type === 'edit'} onClose={() => setModal(null)} title="Modifier Utilisateur">
        {modal?.user && (
          <UserForm
            initial={{ ...modal.user, password: '' }}
            onSubmit={(data) => updateMutation.mutate({ id: modal.user.id, data })}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
