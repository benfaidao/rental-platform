import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getContract, getCars, updateContract } from '../../api'
import { ContractForm } from './Contracts'
import { ArrowLeft, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditContract() {
  const { agencyId, contractId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: contract, isLoading: loadingContract } = useQuery({
    queryKey: ['contract', agencyId, contractId],
    queryFn: () => getContract(agencyId, contractId).then(r => r.data),
  })

  const { data: cars = [], isLoading: loadingCars } = useQuery({
    queryKey: ['cars', agencyId],
    queryFn: () => getCars(agencyId).then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: (data) => updateContract(agencyId, contractId, data),
    onSuccess: () => {
      qc.invalidateQueries(['contracts', agencyId])
      toast.success('Réservation mise à jour')
      navigate(`/agency/${agencyId}/contracts`)
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur'),
  })

  if (loadingContract || loadingCars) {
    return <div className="text-center py-16 text-gray-400">Chargement...</div>
  }

  if (!contract) {
    return <div className="text-center py-16 text-gray-400">Réservation introuvable</div>
  }

  const initial = {
    ...contract,
    startDate: contract.startDate?.split('T')[0],
    endDate: contract.endDate?.split('T')[0],
    amountPaid: contract.amountPaid ?? 0,
    collectedBy: contract.collectedBy ?? '',
    collectedAt: contract.collectedAt?.split('T')[0] ?? '',
    clientIdExpiry: contract.clientIdExpiry?.split('T')[0] ?? '',
    clientLicenseExpiry: contract.clientLicenseExpiry?.split('T')[0] ?? '',
    secondDriverIdExpiry: contract.secondDriverIdExpiry?.split('T')[0] ?? '',
    secondDriverLicenseExpiry: contract.secondDriverLicenseExpiry?.split('T')[0] ?? '',
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/agency/${agencyId}/contracts`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux réservations
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">Modifier la réservation</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Edit2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{contract.contractNumber}</h1>
          <p className="text-sm text-gray-500">
            {contract.clientName}
            {contract.car && ` — ${contract.car.brand} ${contract.car.model} (${contract.car.finalPlate || contract.car.wwPlate})`}
          </p>
        </div>
      </div>

      <div className="card">
        <ContractForm
          initial={initial}
          cars={cars}
          agencyId={agencyId}
          onSubmit={(data) => updateMutation.mutate(data)}
          loading={updateMutation.isPending}
        />
      </div>
    </div>
  )
}
