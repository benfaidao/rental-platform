import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPartners, createPartner, updatePartner, deletePartner,
  createPartnerContact, updatePartnerContact, deletePartnerContact,
} from '../../api'
import Modal from '../../components/Modal'
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Phone, Mail, MapPin, Globe, User } from 'lucide-react'
import toast from 'react-hot-toast'

const PARTNER_TYPES = ['Garage', 'Assureur', 'Fournisseur', 'Concessionnaire', 'Loueur', 'Banque', 'Autre']

function ContactRow({ agencyId, partner, contact, onDeleted, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: contact.name, role: contact.role || '', phone: contact.phone || '', email: contact.email || '', notes: contact.notes || '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const qc = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (d) => updatePartnerContact(agencyId, partner.id, contact.id, d),
    onSuccess: () => { qc.invalidateQueries(['partners', agencyId]); setEditing(false); toast.success('Contact mis à jour') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const deleteMutation = useMutation({
    mutationFn: () => deletePartnerContact(agencyId, partner.id, contact.id),
    onSuccess: () => { qc.invalidateQueries(['partners', agencyId]); toast.success('Contact supprimé') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="py-2 px-3"><input className="input text-xs py-1" value={form.name} onChange={set('name')} required /></td>
        <td className="py-2 px-3"><input className="input text-xs py-1" value={form.role} onChange={set('role')} placeholder="Poste" /></td>
        <td className="py-2 px-3"><input className="input text-xs py-1" value={form.phone} onChange={set('phone')} placeholder="Téléphone" /></td>
        <td className="py-2 px-3"><input className="input text-xs py-1" value={form.email} onChange={set('email')} placeholder="Email" /></td>
        <td className="py-2 px-3 flex gap-1">
          <button onClick={() => updateMutation.mutate(form)} className="btn-primary text-xs py-1 px-2">OK</button>
          <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1 px-2">Annuler</button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 text-sm">
      <td className="py-2 px-3 font-medium">{contact.name}</td>
      <td className="py-2 px-3 text-gray-500">{contact.role || '-'}</td>
      <td className="py-2 px-3">
        {contact.phone ? (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
            <Phone className="w-3 h-3" />{contact.phone}
          </a>
        ) : '-'}
      </td>
      <td className="py-2 px-3">
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
            <Mail className="w-3 h-3" />{contact.email}
          </a>
        ) : '-'}
      </td>
      <td className="py-2 px-3 flex gap-1">
        <button onClick={() => setEditing(true)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
        <button onClick={() => { if (confirm('Supprimer ce contact ?')) deleteMutation.mutate() }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
      </td>
    </tr>
  )
}

function PartnerCard({ agencyId, partner }) {
  const [expanded, setExpanded] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [contactModal, setContactModal] = useState(false)
  const [form, setForm] = useState({ name: partner.name, contactName: partner.contactName || '', type: partner.type || '', address: partner.address || '', phone: partner.phone || '', email: partner.email || '', website: partner.website || '', notes: partner.notes || '' })
  const [cForm, setCForm] = useState({ name: '', role: '', phone: '', email: '', notes: '' })
  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setC = (k) => (e) => setCForm(f => ({ ...f, [k]: e.target.value }))
  const qc = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (d) => updatePartner(agencyId, partner.id, d),
    onSuccess: () => { qc.invalidateQueries(['partners', agencyId]); setEditModal(false); toast.success('Partenaire mis à jour') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const deleteMutation = useMutation({
    mutationFn: () => deletePartner(agencyId, partner.id),
    onSuccess: () => { qc.invalidateQueries(['partners', agencyId]); toast.success('Partenaire supprimé') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const addContactMutation = useMutation({
    mutationFn: (d) => createPartnerContact(agencyId, partner.id, d),
    onSuccess: () => { qc.invalidateQueries(['partners', agencyId]); setContactModal(false); setCForm({ name: '', role: '', phone: '', email: '', notes: '' }); toast.success('Contact ajouté') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  return (
    <div className="card overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600 text-sm flex-shrink-0">
            {partner.name[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{partner.name}</span>
              {partner.type && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{partner.type}</span>}
              <span className="text-xs text-gray-400">{partner.contacts.length} contact{partner.contacts.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
              {partner.contactName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{partner.contactName}</span>}
              {partner.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{partner.phone}</span>}
              {partner.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{partner.address}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setForm({ name: partner.name, type: partner.type || '', address: partner.address || '', phone: partner.phone || '', email: partner.email || '', website: partner.website || '', notes: partner.notes || '' }); setEditModal(true) }} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-gray-500" /></button>
          <button onClick={() => { if (confirm(`Supprimer ${partner.name} et tous ses contacts ?`)) deleteMutation.mutate() }} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 hover:bg-gray-100 rounded">
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Contacts */}
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="flex justify-between items-center px-4 py-2 bg-gray-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contacts</span>
            <button onClick={() => setContactModal(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
              <Plus className="w-3 h-3" /> Ajouter un contact
            </button>
          </div>
          {partner.contacts.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Nom', 'Poste', 'Téléphone', 'Email', ''].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partner.contacts.map(c => (
                  <ContactRow key={c.id} agencyId={agencyId} partner={partner} contact={c} />
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center py-4 text-xs text-gray-400">Aucun contact — cliquez sur "Ajouter un contact"</p>
          )}
        </div>
      )}

      {/* Edit partner modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Modifier le partenaire">
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Nom de l'entreprise *</label><input className="input" value={form.name} onChange={setF('name')} required /></div>
            <div className="col-span-2"><label className="label">Nom du contact principal</label><input className="input" value={form.contactName} onChange={setF('contactName')} placeholder="Prénom Nom" /></div>
            <div><label className="label">Type</label>
              <select className="input" value={form.type} onChange={setF('type')}>
                <option value="">—</option>
                {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={setF('phone')} /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={setF('email')} /></div>
            <div><label className="label">Site web</label><input className="input" value={form.website} onChange={setF('website')} /></div>
            <div className="col-span-2"><label className="label">Adresse</label><input className="input" value={form.address} onChange={setF('address')} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={setF('notes')} /></div>
          <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={updateMutation.isPending}>Enregistrer</button></div>
        </form>
      </Modal>

      {/* Add contact modal */}
      <Modal isOpen={contactModal} onClose={() => setContactModal(false)} title={`Nouveau contact — ${partner.name}`}>
        <form onSubmit={(e) => { e.preventDefault(); addContactMutation.mutate(cForm) }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="label">Nom *</label><input className="input" value={cForm.name} onChange={setC('name')} required /></div>
            <div><label className="label">Poste / Rôle</label><input className="input" value={cForm.role} onChange={setC('role')} placeholder="Directeur, Commercial..." /></div>
            <div><label className="label">Téléphone</label><input className="input" value={cForm.phone} onChange={setC('phone')} /></div>
            <div className="md:col-span-2"><label className="label">Email</label><input className="input" type="email" value={cForm.email} onChange={setC('email')} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={cForm.notes} onChange={setC('notes')} /></div>
          <div className="flex justify-end"><button type="submit" className="btn-primary justify-center w-full sm:w-fit" disabled={addContactMutation.isPending}>Ajouter</button></div>
        </form>
      </Modal>
    </div>
  )
}

export default function Partners() {
  const { agencyId } = useParams()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', contactName: '', type: '', address: '', phone: '', email: '', website: '', notes: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners', agencyId, search],
    queryFn: () => getPartners(agencyId, search ? { search } : {}).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d) => createPartner(agencyId, d),
    onSuccess: () => { qc.invalidateQueries(['partners', agencyId]); setModal(false); setForm({ name: '', type: '', address: '', phone: '', email: '', website: '', notes: '' }); toast.success('Partenaire ajouté') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <input
          className="input max-w-xs"
          placeholder="Nom, contact, téléphone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau Partenaire
        </button>
      </div>

      {isLoading && <p className="text-center py-10 text-gray-400">Chargement...</p>}

      <div className="space-y-3">
        {partners.map(p => <PartnerCard key={p.id} agencyId={agencyId} partner={p} />)}
        {!isLoading && !partners.length && (
          <div className="text-center py-14 text-gray-400">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucun partenaire trouvé</p>
            <p className="text-sm mt-1">Cliquez sur "Nouveau Partenaire" pour commencer</p>
          </div>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Nouveau Partenaire">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Nom de l'entreprise *</label><input className="input" value={form.name} onChange={set('name')} required /></div>
            <div className="col-span-2"><label className="label">Nom du contact principal</label><input className="input" value={form.contactName} onChange={set('contactName')} placeholder="Prénom Nom" /></div>
            <div><label className="label">Type</label>
              <select className="input" value={form.type} onChange={set('type')}>
                <option value="">—</option>
                {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
            <div><label className="label">Site web</label><input className="input" value={form.website} onChange={set('website')} /></div>
            <div className="col-span-2"><label className="label">Adresse</label><input className="input" value={form.address} onChange={set('address')} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
          <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={createMutation.isPending}>Créer</button></div>
        </form>
      </Modal>
    </div>
  )
}
