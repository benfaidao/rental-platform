import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Build an authenticated URL for a stored file (usable in <img src> / <a href>)
export const getFileUrl = (url, agencyId) => {
  if (!url) return url
  const token = localStorage.getItem('token')
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ''
  const base = API_URL.replace('/api', '')
  if (url.startsWith('/agencies/')) return `${base}${url}${tokenParam}`
  if (url.startsWith('/uploads/') && agencyId) {
    const filename = url.slice('/uploads/'.length)
    return `${base}/agencies/${agencyId}/files/${filename}${tokenParam}`
  }
  return url
}

// Auth
export const login = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')
export const changePassword = (data) => api.put('/auth/change-password', data)
export const forceChangePassword = (newPassword) => api.put('/auth/force-change-password', { newPassword })
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword })

// Admin - Inter-agency Access
export const getAdminAccess = () => api.get('/admin/access')
export const createAdminAccess = (data) => api.post('/admin/access', data)
export const deleteAdminAccess = (id) => api.delete(`/admin/access/${id}`)

// Admin - Agencies
export const getAgencies = () => api.get('/admin/agencies')
export const createAgency = (data) => api.post('/admin/agencies', data)
export const updateAgency = (id, data) => api.put(`/admin/agencies/${id}`, data)
export const deleteAgency = (id) => api.delete(`/admin/agencies/${id}`)
export const getAgencyUsers = (id) => api.get(`/admin/agencies/${id}/users`)
export const addAgencyUser = (id, data) => api.post(`/admin/agencies/${id}/users`, data)
export const removeAgencyUser = (agencyId, userId) => api.delete(`/admin/agencies/${agencyId}/users/${userId}`)
export const getPlatformSettings = () => api.get('/admin/settings')
export const updatePlatformSettings = (data) => api.put('/admin/settings', data)

// Admin - Billing
export const getBillings = () => api.get('/admin/billing')
export const getBillingsByAgency = (agencyId) => api.get(`/admin/billing/agency/${agencyId}`)
export const getBillingStats = () => api.get('/admin/billing/stats')
export const getBillingAlerts = () => api.get('/admin/billing/alerts')
export const createBilling = (data) => api.post('/admin/billing', data)
export const updateBilling = (id, data) => api.put(`/admin/billing/${id}`, data)
export const deleteBilling = (id) => api.delete(`/admin/billing/${id}`)
export const downloadBillingPdf = (id) => api.get(`/admin/billing/${id}/pdf`, { responseType: 'blob' })

// Admin - Agency Contracts (contrats-cadres plateforme/agence)
export const getAgencyContracts = (agencyId) => api.get('/admin/agency-contracts', { params: agencyId ? { agencyId } : {} })
export const createAgencyContract = (data) => api.post('/admin/agency-contracts', data)
export const updateAgencyContract = (id, data) => api.put(`/admin/agency-contracts/${id}`, data)
export const endAgencyContract = (id, data) => api.post(`/admin/agency-contracts/${id}/end`, data)
export const deleteAgencyContract = (id) => api.delete(`/admin/agency-contracts/${id}`)

// Admin - Users
export const getUsers = () => api.get('/admin/users')
export const createUser = (data) => api.post('/admin/users', data)
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/admin/users/${id}`)

// Agency - Dashboard
export const getDashboard = (agencyId) => api.get(`/agencies/${agencyId}/dashboard`)

// Agency - Cars
export const getCars = (agencyId) => api.get(`/agencies/${agencyId}/cars`)
export const getCar = (agencyId, carId) => api.get(`/agencies/${agencyId}/cars/${carId}`)
export const createCar = (agencyId, data) => api.post(`/agencies/${agencyId}/cars`, data)
export const updateCar = (agencyId, carId, data) => api.put(`/agencies/${agencyId}/cars/${carId}`, data)
export const deleteCar = (agencyId, carId) => api.delete(`/agencies/${agencyId}/cars/${carId}`)
export const getCarDocuments = (agencyId, carId) => api.get(`/agencies/${agencyId}/cars/${carId}/documents`)
export const uploadCarDocument = (agencyId, carId, data) =>
  api.post(`/agencies/${agencyId}/cars/${carId}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteCarDocument = (agencyId, carId, docId) =>
  api.delete(`/agencies/${agencyId}/cars/${carId}/documents/${docId}`)

// Agency - Contracts
export const getContracts = (agencyId, params) => api.get(`/agencies/${agencyId}/contracts`, { params })
export const getUpcomingContracts = (agencyId) => api.get(`/agencies/${agencyId}/contracts/upcoming`)
export const getContract = (agencyId, contractId) => api.get(`/agencies/${agencyId}/contracts/${contractId}`)
export const createContract = (agencyId, data) => api.post(`/agencies/${agencyId}/contracts`, data)
export const updateContract = (agencyId, contractId, data) => api.put(`/agencies/${agencyId}/contracts/${contractId}`, data)
export const deleteContract = (agencyId, contractId) => api.delete(`/agencies/${agencyId}/contracts/${contractId}`)
export const getContractPdfUrl = (agencyId, contractId) => `${API_URL}/agencies/${agencyId}/contracts/${contractId}/pdf`
export const getPeriodicPayments = (agencyId, contractId) => api.get(`/agencies/${agencyId}/contracts/${contractId}/payments`)
export const createPeriodicPayment = (agencyId, contractId, data) => api.post(`/agencies/${agencyId}/contracts/${contractId}/payments`, data)
export const updatePeriodicPayment = (agencyId, contractId, paymentId, data) => api.put(`/agencies/${agencyId}/contracts/${contractId}/payments/${paymentId}`, data)
export const deletePeriodicPayment = (agencyId, contractId, paymentId) => api.delete(`/agencies/${agencyId}/contracts/${contractId}/payments/${paymentId}`)
export const downloadContractPdf = (agencyId, contractId) =>
  api.get(`/agencies/${agencyId}/contracts/${contractId}/pdf`, { responseType: 'blob' })
export const downloadContractPdfSigned = (agencyId, contractId, signatures) =>
  api.post(`/agencies/${agencyId}/contracts/${contractId}/pdf`, signatures, { responseType: 'blob' })
export const downloadContractInvoice = (agencyId, contractId) =>
  api.get(`/agencies/${agencyId}/contracts/${contractId}/invoice`, { responseType: 'blob' })
export const downloadContractInvoiceSigned = (agencyId, contractId, signatures) =>
  api.post(`/agencies/${agencyId}/contracts/${contractId}/invoice`, signatures, { responseType: 'blob' })
export const uploadContractPhotos = (agencyId, contractId, data) =>
  api.post(`/agencies/${agencyId}/contracts/${contractId}/photos`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteContractDocument = (agencyId, contractId, documentId) =>
  api.delete(`/agencies/${agencyId}/contracts/${contractId}/documents/${documentId}`)
export const uploadContractDocument = (agencyId, contractId, data) =>
  api.post(`/agencies/${agencyId}/contracts/${contractId}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } })

// Agency - Maintenance
export const getOilChanges = (agencyId, params) => api.get(`/agencies/${agencyId}/maintenance/oil-changes`, { params })
export const createOilChange = (agencyId, data) => api.post(`/agencies/${agencyId}/maintenance/oil-changes`, data)
export const updateOilChange = (agencyId, id, data) => api.put(`/agencies/${agencyId}/maintenance/oil-changes/${id}`, data)
export const deleteOilChange = (agencyId, id) => api.delete(`/agencies/${agencyId}/maintenance/oil-changes/${id}`)
export const getOilChangeConfig = (agencyId, carId) => api.get(`/agencies/${agencyId}/maintenance/oil-change-config/${carId}`)
export const updateOilChangeConfig = (agencyId, carId, data) => api.put(`/agencies/${agencyId}/maintenance/oil-change-config/${carId}`, data)
export const getTires = (agencyId, params) => api.get(`/agencies/${agencyId}/maintenance/tires`, { params })
export const createTire = (agencyId, data) => api.post(`/agencies/${agencyId}/maintenance/tires`, data)
export const updateTire = (agencyId, id, data) => api.put(`/agencies/${agencyId}/maintenance/tires/${id}`, data)
export const deleteTire = (agencyId, id) => api.delete(`/agencies/${agencyId}/maintenance/tires/${id}`)
export const getRepairs = (agencyId, params) => api.get(`/agencies/${agencyId}/maintenance/repairs`, { params })
export const getUpcomingRepairs = (agencyId) => api.get(`/agencies/${agencyId}/maintenance/repairs/upcoming`)
export const createRepair = (agencyId, data) => api.post(`/agencies/${agencyId}/maintenance/repairs`, data)
export const updateRepair = (agencyId, id, data) => api.put(`/agencies/${agencyId}/maintenance/repairs/${id}`, data)
export const deleteRepair = (agencyId, id) => api.delete(`/agencies/${agencyId}/maintenance/repairs/${id}`)
export const uploadRepairPhotos = (agencyId, repairId, data) =>
  api.post(`/agencies/${agencyId}/maintenance/repairs/${repairId}/photos`, data, { headers: { 'Content-Type': 'multipart/form-data' } })

// Agency - Checks
export const getChecksIssued = (agencyId, params) => api.get(`/agencies/${agencyId}/checks/issued`, { params })
export const createCheckIssued = (agencyId, data) => api.post(`/agencies/${agencyId}/checks/issued`, data)
export const updateCheckIssued = (agencyId, id, data) => api.put(`/agencies/${agencyId}/checks/issued/${id}`, data)
export const deleteCheckIssued = (agencyId, id) => api.delete(`/agencies/${agencyId}/checks/issued/${id}`)
export const getChecksReceived = (agencyId, params) => api.get(`/agencies/${agencyId}/checks/received`, { params })
export const createCheckReceived = (agencyId, data) => api.post(`/agencies/${agencyId}/checks/received`, data)
export const updateCheckReceived = (agencyId, id, data) => api.put(`/agencies/${agencyId}/checks/received/${id}`, data)
export const deleteCheckReceived = (agencyId, id) => api.delete(`/agencies/${agencyId}/checks/received/${id}`)

// Agency - Financial
export const getAssociates = (agencyId) => api.get(`/agencies/${agencyId}/financial/associates`)
export const createAssociate = (agencyId, data) => api.post(`/agencies/${agencyId}/financial/associates`, data)
export const updateAssociate = (agencyId, id, data) => api.put(`/agencies/${agencyId}/financial/associates/${id}`, data)
export const deleteAssociate = (agencyId, id) => api.delete(`/agencies/${agencyId}/financial/associates/${id}`)
export const getContributions = (agencyId, params) => api.get(`/agencies/${agencyId}/financial/contributions`, { params })
export const createContribution = (agencyId, data) => api.post(`/agencies/${agencyId}/financial/contributions`, data)
export const updateContribution = (agencyId, id, data) => api.put(`/agencies/${agencyId}/financial/contributions/${id}`, data)
export const deleteContribution = (agencyId, id) => api.delete(`/agencies/${agencyId}/financial/contributions/${id}`)
export const getTransactions = (agencyId, params) => api.get(`/agencies/${agencyId}/financial/transactions`, { params })
export const getTransactionsSummary = (agencyId, params) => api.get(`/agencies/${agencyId}/financial/transactions/summary`, { params })
export const createTransaction = (agencyId, data) => api.post(`/agencies/${agencyId}/financial/transactions`, data)
export const updateTransaction = (agencyId, id, data) => api.put(`/agencies/${agencyId}/financial/transactions/${id}`, data)
export const deleteTransaction = (agencyId, id) => api.delete(`/agencies/${agencyId}/financial/transactions/${id}`)

// Agency - Clients
export const getClients = (agencyId, params) => api.get(`/agencies/${agencyId}/clients`, { params })
export const getClient = (agencyId, clientId) => api.get(`/agencies/${agencyId}/clients/${clientId}`)
export const createClient = (agencyId, data) =>
  api.post(`/agencies/${agencyId}/clients`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateClient = (agencyId, clientId, data) =>
  api.put(`/agencies/${agencyId}/clients/${clientId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteClient = (agencyId, clientId) => api.delete(`/agencies/${agencyId}/clients/${clientId}`)

// Agency - Access
export const getAccess = (agencyId) => api.get(`/agencies/${agencyId}/access`)
export const getAccessibleAgencies = (agencyId) => api.get(`/agencies/${agencyId}/access/agencies`)
export const grantAccess = (agencyId, data) => api.post(`/agencies/${agencyId}/access`, data)
export const revokeAccess = (agencyId, accessId) => api.delete(`/agencies/${agencyId}/access/${accessId}`)

// Agency - Partners
export const getPartners = (agencyId, params) => api.get(`/agencies/${agencyId}/partners`, { params })
export const createPartner = (agencyId, data) => api.post(`/agencies/${agencyId}/partners`, data)
export const updatePartner = (agencyId, partnerId, data) => api.put(`/agencies/${agencyId}/partners/${partnerId}`, data)
export const deletePartner = (agencyId, partnerId) => api.delete(`/agencies/${agencyId}/partners/${partnerId}`)
export const createPartnerContact = (agencyId, partnerId, data) => api.post(`/agencies/${agencyId}/partners/${partnerId}/contacts`, data)
export const updatePartnerContact = (agencyId, partnerId, contactId, data) => api.put(`/agencies/${agencyId}/partners/${partnerId}/contacts/${contactId}`, data)
export const deletePartnerContact = (agencyId, partnerId, contactId) => api.delete(`/agencies/${agencyId}/partners/${partnerId}/contacts/${contactId}`)

// External (inter-agency)
export const getExternalCars = (agencyId, params) => api.get(`/agencies/${agencyId}/external/cars`, { params })
export const getExternalBookings = (agencyId, params) => api.get(`/agencies/${agencyId}/external/bookings`, { params })
export const createExternalBooking = (agencyId, data) => api.post(`/agencies/${agencyId}/external/book`, data)
export const cancelExternalBooking = (agencyId, contractId) => api.delete(`/agencies/${agencyId}/external/bookings/${contractId}`)
export const checkAvailability = (agencyId, params) => api.get(`/agencies/${agencyId}/external/availability`, { params })

// Calendar
export const getCarsCalendar = (agencyId, params) => api.get(`/agencies/${agencyId}/cars/calendar`, { params })

// Car availability (own agency)
export const getCarAvailability = (agencyId, params) => api.get(`/agencies/${agencyId}/cars/availability`, { params })

// Car unavailabilities
export const getCarUnavailabilities = (agencyId, carId) => api.get(`/agencies/${agencyId}/cars/${carId}/unavailabilities`)
export const createCarUnavailability = (agencyId, carId, data) => api.post(`/agencies/${agencyId}/cars/${carId}/unavailabilities`, data)
export const deleteCarUnavailability = (agencyId, carId, id) => api.delete(`/agencies/${agencyId}/cars/${carId}/unavailabilities/${id}`)

// Access management (extended)
export const updateAccess = (agencyId, accessId, data) => api.put(`/agencies/${agencyId}/access/${accessId}`, data)
export const addCarToAccess = (agencyId, accessId, carId) => api.post(`/agencies/${agencyId}/access/${accessId}/cars`, { carId })
export const removeCarFromAccess = (agencyId, accessId, carId) => api.delete(`/agencies/${agencyId}/access/${accessId}/cars/${carId}`)

// Rental Requests
export const getRequestSettings = (agencyId) => api.get(`/agencies/${agencyId}/requests/settings`)
export const updateRequestSettings = (agencyId, data) => api.put(`/agencies/${agencyId}/requests/settings`, data)
export const getMyRequests = (agencyId) => api.get(`/agencies/${agencyId}/requests`)
export const createRentalRequest = (agencyId, data) => api.post(`/agencies/${agencyId}/requests`, data)
export const cancelRentalRequest = (agencyId, requestId) => api.delete(`/agencies/${agencyId}/requests/${requestId}`)
export const updateRentalRequest = (agencyId, requestId, data) => api.put(`/agencies/${agencyId}/requests/${requestId}`, data)
export const getIncomingRequests = (agencyId) => api.get(`/agencies/${agencyId}/requests/incoming`)
export const getRentalRequestStats = (agencyId) => api.get(`/agencies/${agencyId}/requests/stats`)
export const makeOffer = (agencyId, requestId, data) => api.post(`/agencies/${agencyId}/requests/${requestId}/offers`, data)
export const respondToOffer = (agencyId, requestId, offerId, data) => api.put(`/agencies/${agencyId}/requests/${requestId}/offers/${offerId}`, data)

// Chat
export const getChatUsers = (params) => api.get('/chat/users', { params })
export const getChatUnread = () => api.get('/chat/unread')
export const getPublicChatHistory = () => api.get('/chat/public')
export const getPrivateChatHistory = (otherUserId) => api.get(`/chat/private/${otherUserId}`)
export const deleteChatConversation = (otherUserId) => api.delete(`/chat/conversations/${otherUserId}`)


// Sinistres
export const getSinistres = (agencyId, params) => api.get(`/agencies/${agencyId}/sinistres`, { params })
export const createSinistre = (agencyId, data) => api.post(`/agencies/${agencyId}/sinistres`, data)
export const updateSinistre = (agencyId, sinistreId, data) => api.put(`/agencies/${agencyId}/sinistres/${sinistreId}`, data)
export const deleteSinistre = (agencyId, sinistreId) => api.delete(`/agencies/${agencyId}/sinistres/${sinistreId}`)
export const uploadSinistrePhotos = (agencyId, sinistreId, data) => api.post(`/agencies/${agencyId}/sinistres/${sinistreId}/photos`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteSinistrePhoto = (agencyId, sinistreId, photoId) => api.delete(`/agencies/${agencyId}/sinistres/${sinistreId}/photos/${photoId}`)

// Agency profile
export const getAgencyProfile = (agencyId) => api.get(`/agencies/${agencyId}/profile`)
export const updateAgencyProfile = (agencyId, data) => api.put(`/agencies/${agencyId}/profile`, data)
export const updateUserProfile = (agencyId, data) => api.put(`/agencies/${agencyId}/profile/me`, data)
export const requestEmailChange = (agencyId, newEmail) => api.post(`/agencies/${agencyId}/profile/me/request-email-change`, { newEmail })
export const confirmEmailChange = (agencyId, code) => api.post(`/agencies/${agencyId}/profile/me/confirm-email-change`, { code })

// Agency members (admin)
export const getAgencyMembers = (agencyId) => api.get(`/agencies/${agencyId}/members`)
export const addAgencyMember = (agencyId, data) => api.post(`/agencies/${agencyId}/members`, data)
export const updateAgencyMember = (agencyId, userId, data) => api.put(`/agencies/${agencyId}/members/${userId}`, data)
export const removeAgencyMember = (agencyId, userId) => api.delete(`/agencies/${agencyId}/members/${userId}`)
export const resetMemberPassword = (agencyId, userId, newPassword) => api.post(`/agencies/${agencyId}/members/${userId}/reset-password`, { newPassword })

// Agency - Pricing
export const getPricingSeasons = (agencyId) => api.get(`/agencies/${agencyId}/pricing/seasons`)
export const createPricingSeason = (agencyId, data) => api.post(`/agencies/${agencyId}/pricing/seasons`, data)
export const updatePricingSeason = (agencyId, id, data) => api.put(`/agencies/${agencyId}/pricing/seasons/${id}`, data)
export const deletePricingSeason = (agencyId, id) => api.delete(`/agencies/${agencyId}/pricing/seasons/${id}`)
export const getPricingOptions = (agencyId) => api.get(`/agencies/${agencyId}/pricing/options`)
export const createPricingOption = (agencyId, data) => api.post(`/agencies/${agencyId}/pricing/options`, data)
export const updatePricingOption = (agencyId, id, data) => api.put(`/agencies/${agencyId}/pricing/options/${id}`, data)
export const deletePricingOption = (agencyId, id) => api.delete(`/agencies/${agencyId}/pricing/options/${id}`)
