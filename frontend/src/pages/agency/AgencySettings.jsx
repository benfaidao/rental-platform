import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAgencyProfile, updateAgencyProfile, updateUserProfile, requestEmailChange, confirmEmailChange, getAgencyMembers, addAgencyMember, updateAgencyMember, removeAgencyMember, resetMemberPassword } from '../../api'
import { Building2, Phone, Mail, MapPin, Save, User, Hash, Pencil, X, Copy, CheckCircle, Plus, Trash2, Users, Smartphone, KeyRound, Shield, Percent } from 'lucide-react'
import toast from 'react-hot-toast'
import Access from './Access'

function MembersTab({ agencyId }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'USER' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const [resetUserId, setResetUserId] = useState(null)
  const [resetPassword, setResetPassword] = useState('')

  const { data: members = [] } = useQuery({
    queryKey: ['agencyMembers', agencyId],
    queryFn: () => getAgencyMembers(agencyId).then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (data) => addAgencyMember(agencyId, data),
    onSuccess: () => {
      qc.invalidateQueries(['agencyMembers', agencyId])
      setShowForm(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'USER' })
      toast.success('Membre ajouté')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateAgencyMember(agencyId, userId, { role }),
    onSuccess: () => { qc.invalidateQueries(['agencyMembers', agencyId]); toast.success('Rôle mis à jour') },
    onError: () => toast.error('Erreur'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId) => removeAgencyMember(agencyId, userId),
    onSuccess: () => { qc.invalidateQueries(['agencyMembers', agencyId]); toast.success('Membre retiré') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const resetMutation = useMutation({
    mutationFn: ({ userId, newPassword }) => resetMemberPassword(agencyId, userId, newPassword),
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé — l\'employé devra le changer à la prochaine connexion')
      setResetUserId(null)
      setResetPassword('')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        <p className="text-sm text-gray-500">{members.length} membre(s)</p>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center justify-center gap-2 text-sm py-1.5 w-full sm:w-fit">
          <Plus className="w-3.5 h-3.5" /> Ajouter un membre
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(form) }} className="card space-y-4 border border-blue-100 bg-blue-50/30">
          <h3 className="font-medium text-gray-700">Nouveau membre</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label text-xs">Prénom *</label><input className="input" value={form.firstName} onChange={set('firstName')} required /></div>
            <div><label className="label text-xs">Nom *</label><input className="input" value={form.lastName} onChange={set('lastName')} required /></div>
            <div><label className="label text-xs">Email *</label><input className="input" type="email" value={form.email} onChange={set('email')} required /></div>
            <div><label className="label text-xs">Téléphone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
            <div><label className="label text-xs">Mot de passe *</label><input className="input" type="password" value={form.password} onChange={set('password')} required /></div>
            <div>
              <label className="label text-xs">Rôle</label>
              <select className="input" value={form.role} onChange={set('role')}>
                <option value="USER">Utilisateur</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm py-1.5 flex-1 sm:flex-initial" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm py-1.5 flex-1 sm:flex-initial">Annuler</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="card py-3 px-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">{m.user.firstName} {m.user.lastName}</p>
                <p className="text-xs text-gray-500 truncate">{m.user.email}{m.user.phone ? ` · ${m.user.phone}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="input py-1 text-xs flex-1 sm:flex-initial sm:w-36"
                  value={m.role}
                  onChange={(e) => roleMutation.mutate({ userId: m.user.id, role: e.target.value })}
                >
                  <option value="USER">Utilisateur</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
                <button
                  onClick={() => { setResetUserId(v => v === m.user.id ? null : m.user.id); setResetPassword('') }}
                  className="p-1.5 hover:bg-amber-50 rounded text-amber-500 shrink-0"
                  title="Réinitialiser le mot de passe"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm('Retirer ce membre ?')) removeMutation.mutate(m.user.id) }}
                  className="p-1.5 hover:bg-red-50 rounded text-red-400 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {resetUserId === m.user.id && (
              <form
                onSubmit={(e) => { e.preventDefault(); resetMutation.mutate({ userId: m.user.id, newPassword: resetPassword }) }}
                className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-amber-100"
              >
                <input
                  type="password"
                  className="input text-sm flex-1"
                  placeholder="Nouveau mot de passe (min. 6 caractères)"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  minLength={6}
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn-primary text-xs py-1.5 px-3 flex-1 sm:flex-initial"
                    disabled={resetMutation.isPending}
                  >
                    {resetMutation.isPending ? 'Envoi...' : 'Réinitialiser'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetUserId(null); setResetPassword('') }}
                    className="p-1.5 hover:bg-gray-100 rounded shrink-0"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
        {!members.length && (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun membre</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgencySettings() {
  const { agencyId } = useParams()
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['agencyProfile', agencyId],
    queryFn: () => getAgencyProfile(agencyId).then(r => r.data),
  })

  const isAdmin = profile?.agencyRole === 'ADMIN'

  // ── Formulaire agence ────────────────────────────────────────────────────────
  const [agencyForm, setAgencyForm] = useState({ name: '', address: '', phone: '', email: '', ice: '', ic: '', rc: '', device: '', vatRate: '' })

  useEffect(() => {
    if (profile?.agency) {
      setAgencyForm({
        name:    profile.agency.name    || '',
        address: profile.agency.address || '',
        phone:   profile.agency.phone   || '',
        email:   profile.agency.email   || '',
        ice:     profile.agency.ice     || '',
        ic:      profile.agency.ic      || '',
        rc:      profile.agency.rc      || '',
        device:  profile.agency.device  || '',
        vatRate: profile.agency.vatRate != null ? String(profile.agency.vatRate) : '',
      })
    }
  }, [profile])

  const agencyMutation = useMutation({
    mutationFn: (data) => updateAgencyProfile(agencyId, data),
    onSuccess: () => {
      qc.invalidateQueries(['agencyProfile', agencyId])
      qc.invalidateQueries(['dashboard', agencyId])
      toast.success('Profil agence mis à jour')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  // ── Formulaire utilisateur ───────────────────────────────────────────────────
  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', phone: '' })

  useEffect(() => {
    if (profile?.user) {
      setUserForm({
        firstName: profile.user.firstName || '',
        lastName:  profile.user.lastName  || '',
        phone:     profile.user.phone     || '',
      })
    }
  }, [profile])

  const userMutation = useMutation({
    mutationFn: (data) => updateUserProfile(agencyId, data),
    onSuccess: () => {
      qc.invalidateQueries(['agencyProfile', agencyId])
      toast.success('Profil personnel mis à jour')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  // ── Changement d'email ───────────────────────────────────────────────────────
  const [emailStep, setEmailStep] = useState('idle') // 'idle' | 'input' | 'verify'
  const [newEmail, setNewEmail] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [devCode, setDevCode] = useState(null) // code affiché si pas de SMTP
  const [codeCopied, setCodeCopied] = useState(false)

  const requestEmailMutation = useMutation({
    mutationFn: () => requestEmailChange(agencyId, newEmail),
    onSuccess: (res) => {
      setEmailStep('verify')
      if (res.data.code) {
        setDevCode(res.data.code)
      } else {
        setDevCode(null)
        toast.success(res.data.message)
      }
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const confirmEmailMutation = useMutation({
    mutationFn: () => confirmEmailChange(agencyId, verifyCode),
    onSuccess: (res) => {
      toast.success('Email mis à jour avec succès')
      setEmailStep('idle')
      setNewEmail('')
      setVerifyCode('')
      setDevCode(null)
      qc.invalidateQueries(['agencyProfile', agencyId])
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Code invalide ou expiré'),
  })

  const cancelEmailChange = () => {
    setEmailStep('idle')
    setNewEmail('')
    setVerifyCode('')
    setDevCode(null)
  }

  const [tab, setTab] = useState('profile')

  if (isLoading) return <div className="text-center py-12 text-gray-400">Chargement...</div>

  return (
    <div className={`space-y-6 ${tab !== 'access' ? 'max-w-xl' : ''}`}>
      {/* ── Onglets ── */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        <button onClick={() => setTab('profile')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Mon profil
        </button>
        {isAdmin && (
          <>
            <button onClick={() => setTab('agency')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === 'agency' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Agence
            </button>
            <button onClick={() => setTab('members')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === 'members' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Membres
            </button>
            <button onClick={() => setTab('access')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === 'access' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Accès inter-agences</span>
            </button>
          </>
        )}
      </div>

      {/* ── Onglet Membres ── */}
      {tab === 'members' && isAdmin && <MembersTab agencyId={agencyId} />}

      {/* ── Onglet Accès inter-agences ── */}
      {tab === 'access' && isAdmin && <Access />}

      {/* ── Les autres onglets ── */}
      {(tab === 'profile' || tab === 'agency') && <div className="space-y-8">

      {/* ── Section agence (admin seulement) ── */}
      {isAdmin && tab === 'agency' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Paramètres de l'agence</h2>
            <p className="text-sm text-gray-500 mt-1">Ces informations apparaissent sur les contrats PDF générés.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); agencyMutation.mutate(agencyForm) }} className="card space-y-5">
            <div>
              <label className="label flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" /> Nom de l'agence *
              </label>
              <input
                className="input"
                value={agencyForm.name}
                onChange={e => setAgencyForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="Nom de votre agence"
              />
            </div>

            <div>
              <label className="label flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" /> Adresse postale
              </label>
              <input
                className="input"
                value={agencyForm.address}
                onChange={e => setAgencyForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" /> Téléphone agence
                </label>
                <input
                  className="input"
                  value={agencyForm.phone}
                  onChange={e => setAgencyForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0600000000"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" /> Email
                </label>
                <input
                  className="input"
                  type="email"
                  value={agencyForm.email}
                  onChange={e => setAgencyForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@agence.ma"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" /> ICE
                </label>
                <input
                  className="input"
                  value={agencyForm.ice}
                  onChange={e => setAgencyForm(f => ({ ...f, ice: e.target.value }))}
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
                  value={agencyForm.ic}
                  onChange={e => setAgencyForm(f => ({ ...f, ic: e.target.value }))}
                  placeholder="Identifiant commercial"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" /> RC
                </label>
                <input
                  className="input"
                  value={agencyForm.rc}
                  onChange={e => setAgencyForm(f => ({ ...f, rc: e.target.value }))}
                  placeholder="Registre de commerce"
                />
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-gray-400" /> Device / Terminal
              </label>
              <input
                className="input"
                value={agencyForm.device}
                onChange={e => setAgencyForm(f => ({ ...f, device: e.target.value }))}
                placeholder="Identifiant ou modèle du terminal"
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-600 mb-3">Facturation</h4>
              <div>
                <label className="label flex items-center gap-2">
                  <Percent className="w-4 h-4 text-gray-400" /> Taux de TVA (%)
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={agencyForm.vatRate}
                  onChange={e => setAgencyForm(f => ({ ...f, vatRate: e.target.value }))}
                  placeholder="Laisser vide si non assujetti à la TVA"
                />
                <p className="text-xs text-gray-400 mt-1">Si renseigné, les factures afficheront automatiquement le détail HT / TVA / TTC.</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary flex items-center justify-center gap-2 w-full sm:w-fit"
                disabled={agencyMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {agencyMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Section profil personnel ── */}
      {tab === 'profile' && <div className="space-y-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">Mon profil</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
              {isAdmin ? 'Administrateur' : 'Utilisateur'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Vos informations personnelles.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); userMutation.mutate(userForm) }} className="card space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Prénom *
              </label>
              <input
                className="input"
                value={userForm.firstName}
                onChange={e => setUserForm(f => ({ ...f, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Nom *
              </label>
              <input
                className="input"
                value={userForm.lastName}
                onChange={e => setUserForm(f => ({ ...f, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Email avec flux de vérification */}
          <div>
            <label className="label flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" /> Email
            </label>

            {emailStep === 'idle' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input className="input bg-gray-50 flex-1" value={profile?.user?.email || ''} disabled />
                <button
                  type="button"
                  onClick={() => setEmailStep('input')}
                  className="btn-secondary flex items-center justify-center gap-1.5 text-sm py-2 px-3 shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
              </div>
            )}

            {emailStep === 'input' && (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="email"
                    className="input flex-1"
                    placeholder="Nouvel email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => requestEmailMutation.mutate()}
                      disabled={!newEmail.trim() || requestEmailMutation.isPending}
                      className="btn-primary text-sm py-2 px-3 shrink-0 flex-1 sm:flex-initial"
                    >
                      {requestEmailMutation.isPending ? 'Envoi...' : 'Envoyer le code'}
                    </button>
                    <button type="button" onClick={cancelEmailChange} className="p-2 hover:bg-gray-100 rounded shrink-0">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {emailStep === 'verify' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Code envoyé à <span className="font-semibold text-blue-700">{newEmail}</span>. Entrez-le ci-dessous.
                </p>

                {devCode && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 flex-1">
                      Pas de SMTP — code de vérification : <span className="font-bold text-lg tracking-widest">{devCode}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(devCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) }}
                      className="p-1.5 hover:bg-amber-100 rounded"
                      title="Copier le code"
                    >
                      {codeCopied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="text"
                    className="input flex-1 text-center text-xl tracking-[0.4em] font-mono"
                    placeholder="000000"
                    maxLength={6}
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => confirmEmailMutation.mutate()}
                      disabled={verifyCode.length !== 6 || confirmEmailMutation.isPending}
                      className="btn-primary text-sm py-2 px-3 shrink-0 flex-1 sm:flex-initial"
                    >
                      {confirmEmailMutation.isPending ? 'Vérification...' : 'Confirmer'}
                    </button>
                    <button type="button" onClick={cancelEmailChange} className="p-2 hover:bg-gray-100 rounded shrink-0">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" /> Téléphone personnel
            </label>
            <input
              className="input"
              value={userForm.phone}
              onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="0600000000"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-fit"
              disabled={userMutation.isPending}
            >
              <Save className="w-4 h-4" />
              {userMutation.isPending ? 'Enregistrement...' : 'Enregistrer mes informations'}
            </button>
          </div>
        </form>
      </div>}

      </div>}
    </div>
  )
}
