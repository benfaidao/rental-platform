import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getChecksIssued, createCheckIssued, updateCheckIssued, deleteCheckIssued,
  getChecksReceived, createCheckReceived, updateCheckReceived, deleteCheckReceived,
} from '../../api'
import Modal from '../../components/Modal'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'
const STATUS = { PAID: 'Payé', UNUSED: 'Non exploité', CANCELLED: 'Annulé', NONE: '-' }
const STATUS_BADGE = { PAID: 'badge-green', UNUSED: 'badge-yellow', CANCELLED: 'badge-red', NONE: 'badge-gray' }

function CheckForm({ initial, onSubmit, loading, isIssued }) {
  const [form, setForm] = useState(initial || { checkNumber: '', payableTo: '', amount: '', date: '', encaissementDate: '', status: 'NONE', reason: '', comment: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">N° Chèque *</label><input className="input" value={form.checkNumber} onChange={set('checkNumber')} required /></div>
        <div><label className="label">À l'ordre de *</label><input className="input" value={form.payableTo} onChange={set('payableTo')} required /></div>
        <div><label className="label">Montant (MAD) *</label><input className="input" type="number" step="0.01" value={form.amount} onChange={set('amount')} required /></div>
        <div><label className="label">{isIssued ? "Date d'émission *" : 'Date *'}</label><input className="input" type="date" value={form.date} onChange={set('date')} required /></div>
        {isIssued && (
          <div><label className="label">Date d'encaissement demandée</label><input className="input" type="date" value={form.encaissementDate || ''} onChange={set('encaissementDate')} /></div>
        )}
        <div>
          <label className="label">Situation</label>
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="NONE">—</option>
            <option value="PAID">Payé</option>
            <option value="UNUSED">Non exploité</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>
        <div><label className="label">Raison</label><input className="input" value={form.reason} onChange={set('reason')} /></div>
      </div>
      <div><label className="label">Commentaire</label><textarea className="input" rows={2} value={form.comment} onChange={set('comment')} /></div>
      <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button></div>
    </form>
  )
}

function CheckTable({ checks, onEdit, onDelete, isIssued }) {
  const total = checks.reduce((s, c) => s + c.amount, 0)
  const totalUnused = checks.filter(c => c.status === 'UNUSED').reduce((s, c) => s + c.amount, 0)
  const headers = isIssued
    ? ['N° Chèque', "À l'ordre de", 'Montant', "Date d'émission", "Encaissement demandé", 'Situation', 'Raison', '']
    : ['N° Chèque', "À l'ordre de", 'Montant', 'Date', 'Situation', 'Raison', '']
  const colSpan = headers.length

  return (
    <div>
      <div className="flex gap-4 mb-4 text-sm">
        <span className="text-gray-500">Total: <strong>{total.toLocaleString()} MAD</strong></span>
        {totalUnused > 0 && <span className="text-yellow-600">Non exploités: <strong>{totalUnused.toLocaleString()} MAD</strong></span>}
      </div>
      <table className="w-full text-sm bg-white rounded-xl shadow-sm border border-gray-100">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>{headers.map(h => <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>)}</tr>
        </thead>
        <tbody>
          {checks.map(c => (
            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-sm">{c.checkNumber}</td>
              <td className="py-3 px-4 font-medium">{c.payableTo}</td>
              <td className="py-3 px-4">{c.amount.toLocaleString()} MAD</td>
              <td className="py-3 px-4 text-gray-500">{fmtDate(c.date)}</td>
              {isIssued && <td className="py-3 px-4 text-gray-500">{c.encaissementDate ? fmtDate(c.encaissementDate) : '-'}</td>}
              <td className="py-3 px-4"><span className={STATUS_BADGE[c.status]}>{STATUS[c.status]}</span></td>
              <td className="py-3 px-4 text-gray-500 text-xs">{c.reason || c.comment || '-'}</td>
              <td className="py-3 px-4">
                <div className="flex gap-1">
                  <button onClick={() => onEdit(c)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                  <button onClick={() => { if (confirm('Supprimer ?')) onDelete(c.id) }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </td>
            </tr>
          ))}
          {!checks.length && <tr><td colSpan={colSpan} className="py-8 text-center text-gray-400">Aucun chèque</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export default function Checks() {
  const { agencyId } = useParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState('issued')
  const [modal, setModal] = useState(null)

  const { data: issued = [] } = useQuery({ queryKey: ['checksIssued', agencyId], queryFn: () => getChecksIssued(agencyId).then(r => r.data) })
  const { data: received = [] } = useQuery({ queryKey: ['checksReceived', agencyId], queryFn: () => getChecksReceived(agencyId).then(r => r.data) })

  const issuedCreate = useMutation({ mutationFn: (d) => createCheckIssued(agencyId, d), onSuccess: () => { qc.invalidateQueries(['checksIssued', agencyId]); setModal(null); toast.success('Chèque ajouté') }, onError: (e) => toast.error(e.response?.data?.error || 'Erreur') })
  const issuedUpdate = useMutation({ mutationFn: ({ id, data }) => updateCheckIssued(agencyId, id, data), onSuccess: () => { qc.invalidateQueries(['checksIssued', agencyId]); setModal(null); toast.success('Mis à jour') } })
  const issuedDelete = useMutation({ mutationFn: (id) => deleteCheckIssued(agencyId, id), onSuccess: () => { qc.invalidateQueries(['checksIssued', agencyId]); toast.success('Supprimé') } })

  const receivedCreate = useMutation({ mutationFn: (d) => createCheckReceived(agencyId, d), onSuccess: () => { qc.invalidateQueries(['checksReceived', agencyId]); setModal(null); toast.success('Chèque ajouté') }, onError: (e) => toast.error(e.response?.data?.error || 'Erreur') })
  const receivedUpdate = useMutation({ mutationFn: ({ id, data }) => updateCheckReceived(agencyId, id, data), onSuccess: () => { qc.invalidateQueries(['checksReceived', agencyId]); setModal(null); toast.success('Mis à jour') } })
  const receivedDelete = useMutation({ mutationFn: (id) => deleteCheckReceived(agencyId, id), onSuccess: () => { qc.invalidateQueries(['checksReceived', agencyId]); toast.success('Supprimé') } })

  const isIssued = tab === 'issued'
  const handleSubmit = (data) => {
    if (modal?.check) {
      isIssued ? issuedUpdate.mutate({ id: modal.check.id, data }) : receivedUpdate.mutate({ id: modal.check.id, data })
    } else {
      isIssued ? issuedCreate.mutate(data) : receivedCreate.mutate(data)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 border-b border-gray-200">
          {[{ id: 'issued', label: 'Chèques Émis' }, { id: 'received', label: 'Chèques Reçus' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setModal({ check: null })} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau Chèque
        </button>
      </div>

      {isIssued ? (
        <CheckTable
          checks={issued}
          isIssued
          onEdit={(c) => setModal({ check: { ...c, date: c.date?.split('T')[0], encaissementDate: c.encaissementDate?.split('T')[0] || '' } })}
          onDelete={(id) => issuedDelete.mutate(id)}
        />
      ) : (
        <CheckTable
          checks={received}
          onEdit={(c) => setModal({ check: { ...c, date: c.date?.split('T')[0] } })}
          onDelete={(id) => receivedDelete.mutate(id)}
        />
      )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={`${modal?.check ? 'Modifier' : 'Nouveau'} Chèque ${isIssued ? 'Émis' : 'Reçu'}`}>
        <CheckForm
          initial={modal?.check}
          onSubmit={handleSubmit}
          isIssued={isIssued}
          loading={issuedCreate.isPending || issuedUpdate.isPending || receivedCreate.isPending || receivedUpdate.isPending}
        />
      </Modal>
    </div>
  )
}
