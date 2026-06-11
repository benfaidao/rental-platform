import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccess, updateAccess, addCarToAccess, removeCarFromAccess, getCars } from '../../api'
import { Car, Building2, ChevronDown, ChevronRight, Shield, Eye, Info, Ban } from 'lucide-react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Car selection for SPECIFIC access ───────────────────────────────────────
function CarAccessManager({ agencyId, access, ownCars }) {
  const qc = useQueryClient()

  const addMutation = useMutation({
    mutationFn: (carId) => addCarToAccess(agencyId, access.id, carId),
    onSuccess: () => { qc.invalidateQueries(['access', agencyId]); toast.success('Voiture ajoutée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })
  const removeMutation = useMutation({
    mutationFn: (carId) => removeCarFromAccess(agencyId, access.id, carId),
    onSuccess: () => { qc.invalidateQueries(['access', agencyId]); toast.success('Voiture retirée') },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const sharedCarIds = new Set(access.carAccesses.map(ca => ca.carId))
  const unsharedCars = ownCars.filter(c => !sharedCarIds.has(c.id))

  return (
    <div className="mt-3 space-y-2">
      {access.carAccesses.map(ca => (
        <div key={ca.carId} className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-1.5">
          <div className="flex items-center gap-2">
            <Car className="w-3.5 h-3.5 text-green-600" />
            <span className="text-sm font-medium">{ca.car?.brand} {ca.car?.model}</span>
            <span className="text-xs text-gray-400">{ca.car?.finalPlate || ca.car?.wwPlate || ''}</span>
          </div>
          <button onClick={() => removeMutation.mutate(ca.carId)} className="p-1 hover:bg-red-50 rounded text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {unsharedCars.length > 0 && (
        <select className="input text-sm py-1 w-full"
          defaultValue=""
          onChange={e => { if (e.target.value) { addMutation.mutate(e.target.value); e.target.value = '' } }}>
          <option value="">+ Ajouter une voiture…</option>
          {unsharedCars.map(c => (
            <option key={c.id} value={c.id}>
              {c.brand} {c.model} {c.finalPlate ? `(${c.finalPlate})` : c.wwPlate ? `(${c.wwPlate})` : ''}
            </option>
          ))}
        </select>
      )}

      {access.carAccesses.length === 0 && (
        <p className="text-xs text-orange-500">Aucune voiture sélectionnée — choisissez des voitures ci-dessus</p>
      )}
    </div>
  )
}

// ─── Access card (outgoing — giver side) ─────────────────────────────────────
function GiverAccessCard({ agencyId, access, ownCars }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (data) => updateAccess(agencyId, access.id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['access', agencyId])
      toast.success('Paramètre mis à jour')
      if (vars.accessType === 'SPECIFIC') setExpanded(true)
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  const isSpecific = access.accessType === 'SPECIFIC'
  const isBlocked = access.accessType === 'BLOCKED'

  return (
    <div className={`card p-0 overflow-hidden ${isBlocked ? 'border border-red-200' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isBlocked ? 'bg-red-100' : 'bg-blue-100'}`}>
            {isBlocked
              ? <Ban className="w-4 h-4 text-red-600" />
              : <Building2 className="w-4 h-4 text-blue-600" />}
          </div>
          <div>
            <p className="font-medium">{access.receiverAgency?.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${isBlocked ? 'bg-red-100 text-red-700'
              : !isSpecific ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'}`}>
              {isBlocked ? 'Accès bloqué'
                : !isSpecific ? 'Toutes les voitures'
                : `${access.carAccesses.length} voiture(s) choisie(s)`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className={`input text-xs py-1 flex-1 sm:w-56 sm:flex-none ${isBlocked ? 'border-red-300 text-red-700' : ''}`}
            value={access.accessType}
            onChange={e => updateMutation.mutate({
              accessType: e.target.value,
              carIds: e.target.value === 'ALL' || e.target.value === 'BLOCKED' ? [] : access.carAccesses.map(ca => ca.carId),
            })}
          >
            <option value="ALL">Toutes les voitures (y compris futures)</option>
            <option value="SPECIFIC">Voitures spécifiques uniquement</option>
            <option value="BLOCKED">⛔ Bloquer l'accès</option>
          </select>
          {!isBlocked && (
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 hover:bg-gray-100 rounded shrink-0">
              {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
          )}
        </div>
      </div>

      {isBlocked && (
        <div className="border-t border-red-100 px-4 py-3 bg-red-50">
          <p className="text-xs text-red-600">
            <strong>{access.receiverAgency?.name}</strong> ne peut plus voir ni réserver vos voitures.
            Changez l'option ci-dessus pour rétablir l'accès.
          </p>
        </div>
      )}

      {isSpecific && !isBlocked && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <CarAccessManager agencyId={agencyId} access={access} ownCars={ownCars} />
        </div>
      )}

      {!isSpecific && !isBlocked && expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">
            <strong>{access.receiverAgency?.name}</strong> peut voir et réserver toutes vos voitures disponibles, y compris celles ajoutées à l'avenir.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Access() {
  const { agencyId } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['access', agencyId],
    queryFn: () => getAccess(agencyId).then(r => r.data),
  })
  const { data: ownCars = [] } = useQuery({
    queryKey: ['cars', agencyId],
    queryFn: () => getCars(agencyId).then(r => r.data),
  })

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p>
          Les accès inter-agences sont créés par l'administrateur. Une fois un accès accordé, vous choisissez ici
          si vous partagez <strong>toutes vos voitures</strong> (y compris celles ajoutées plus tard)
          ou <strong>seulement certaines voitures</strong>.
        </p>
      </div>

      {/* Outgoing: giver side — agency configures what to share */}
      <div className="space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" /> Agences qui accèdent à vos voitures
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Choisissez pour chaque agence si elle voit toutes vos voitures ou seulement certaines.
          </p>
        </div>

        {isLoading && <p className="text-center py-8 text-gray-400">Chargement...</p>}

        <div className="space-y-3">
          {data?.given.map(access => (
            <GiverAccessCard key={access.id} agencyId={agencyId} access={access} ownCars={ownCars} />
          ))}
          {!isLoading && !data?.given.length && (
            <div className="text-center py-10 text-gray-400">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Aucune agence n'a accès à vos voitures pour l'instant</p>
              <p className="text-sm mt-1">Contactez votre administrateur pour configurer des accès</p>
            </div>
          )}
        </div>
      </div>

      {/* Incoming: receiver side — read only */}
      <div className="space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Eye className="w-5 h-5 text-green-500" /> Voitures auxquelles vous avez accès
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Agences dont vous pouvez réserver les voitures disponibles.</p>
        </div>

        {data?.received.map(access => (
          <div key={access.id} className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">{access.giverAgency?.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${access.accessType === 'BLOCKED' ? 'bg-red-100 text-red-700'
                  : access.accessType === 'ALL' ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'}`}>
                  {access.accessType === 'BLOCKED' ? 'Accès bloqué par cette agence'
                    : access.accessType === 'ALL' ? 'Toutes les voitures disponibles'
                    : `${access.carAccesses.length} voiture(s) spécifique(s)`}
                </span>
              </div>
            </div>
            {access.accessType === 'SPECIFIC' && access.carAccesses.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {access.carAccesses.map(ca => (
                  <span key={ca.carId} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {ca.car?.brand} {ca.car?.model}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {!isLoading && !data?.received.length && (
          <p className="text-center py-6 text-gray-400 text-sm">
            Aucune agence ne vous a accordé d'accès à ses voitures
          </p>
        )}
      </div>
    </div>
  )
}
