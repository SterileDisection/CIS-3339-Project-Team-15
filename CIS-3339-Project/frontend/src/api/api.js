// This file contains all API calls to the API endpoints
// import axios to make API calls
import axios from 'axios'

// Create HTTP client with the base URL, and specify that the data sent in the request body is JSON
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_ROOT_API,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Login related API calls
// If user logs in successfully, this sets a header on "apiClient" called "Authorization" with the value
// "Bearer <token>". This security token is used to validate API calls.
// F4: exported so the login store can put the header back when it restores a saved session on refresh
export function setAuthHeader(token) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// When user logs out, this function removes the Authorization header from apiClient
function removeAuthHeader() {
  delete apiClient.defaults.headers.common['Authorization']
}

// ---------------------------------------------------------------------------
// F2: centralized error handling
// Every failed request goes through this one interceptor, so views and stores never have to
// work out what went wrong themselves. A failed call always rejects with ONE short readable
// string, so nothing can show up on screen as "[object Object]".
// ---------------------------------------------------------------------------

// F2: what to do when the server says the session is no longer valid (401).
// main.js registers the real handler (clear the Pinia login state and go to /login).
// It's registered from outside because the store imports this file, so importing the store
// here would create a circular import.
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

// F2: turns any axios error into one short message
function toErrorMessage(error) {
  // no response at all: backend is down, wrong URL, CORS blocked, or no internet
  if (!error.response) {
    return 'Unable to reach the server'
  }
  const body = error.response.data
  // the backend sends errors either as plain text or as JSON like { error } / { message }
  if (typeof body === 'string' && body.trim()) return body
  if (body && typeof body.error === 'string') return body.error
  if (body && typeof body.message === 'string') return body.message
  return `Request failed (${error.response.status})`
}

apiClient.interceptors.response.use(
  // successful responses pass straight through
  (response) => response,
  (error) => {
    const status = error.response && error.response.status
    const isLoginCall = error.config && error.config.url === '/users/login'
    // F2: 401 means our token is missing, expired or invalid -> log the user out.
    // A wrong password on the login form is not a session problem, so skip the login call itself.
    if (status === 401 && !isLoginCall) {
      logoutUser()
      if (onUnauthorized) onUnauthorized()
    }
    return Promise.reject(toErrorMessage(error))
  }
)

// API call to log the user in
export async function loginUser(username, password) {
  try {
    const response = await apiClient.post('/users/login', {
      username,
      password
    })
    const token = response.data.token
    localStorage.setItem('authToken', token)
    setAuthHeader(token)
    return token
  } catch (message) {
    // the interceptor already turned the failure into a readable string;
    // the login store expects an Error, so wrap it
    throw new Error(message)
  }
}

// API call to log the user out
export function logoutUser() {
  localStorage.removeItem('authToken')
  removeAuthHeader()
}

// F2: every call below used to be wrapped in try { ... } catch (error) { throw error } or
// throw error.response.data. That added nothing, and the second form crashed with a TypeError
// when the backend was down. The interceptor above handles all errors now, so each call is one line.

// Org related API calls
// API call to get org name
export const getOrgName = async () => (await apiClient.get('/org')).data

// Events related API calls
// API call to get all events for org
export const getEvents = async () => (await apiClient.get('/events/')).data

// API call to GET single event by ID
export const getEventById = async (id) => (await apiClient.get(`/events/id/${id}`)).data

// API call to GET events based on search query
export const searchEvents = async (query) => {
  let params = {}
  if (query.searchBy === 'name') {
    params.searchBy = query.searchBy
    params.name = query.name || ''
  } else if (query.searchBy === 'date') {
    params.searchBy = 'date'
    params.eventDate = query.eventDate || ''
  }
  return (await apiClient.get('/events/search', { params })).data
}

// API call to GET events for which a client is signed up
export const getClientEvents = async (id) => (await apiClient.get(`/events/client/${id}`)).data

// API call to GET events for which a client is not signed up
export const getNonClientEvents = async (id) =>
  (await apiClient.get(`/events/client/${id}/not-registered`)).data

// API call to GET all attendees for an event
export const getEventAttendees = async (id) => (await apiClient.get(`/events/attendees/${id}`)).data

// API call to GET all events for a given service
export const getEventsByServiceId = async (id) => (await apiClient.get(`/events/service/${id}`)).data

// API call to POST new event
export const createEvent = async (eventData) => (await apiClient.post('/events/', eventData)).data

// API call to PUT update event
export const updateEvent = async (id, eventData) =>
  (await apiClient.put(`/events/update/${id}`, eventData)).data

// API call to PUT add attendee to event
export const registerAttendee = async (eventId, clientId) =>
  (await apiClient.put('/events/register', {}, { params: { event: eventId, client: clientId } })).data

// API call to PUT remove attendee from event
export const deregisterAttendee = async (eventId, clientId) =>
  (await apiClient.put('/events/deregister', {}, { params: { event: eventId, client: clientId } })).data

// API call to DELETE event by ID
export const deleteEvent = async (id) => (await apiClient.delete(`/events/${id}`)).data

// API call to get events for last two month for dashboard
export const getAttendance = async () => (await apiClient.get('/events/attendance')).data

// Clients related API calls
// API call to GET all clients for org
export const getClients = async () => (await apiClient.get('/clients')).data

// API call to GET single client by ID
export const getClientById = async (id) => (await apiClient.get(`/clients/id/${id}`)).data

// API call to GET entries based on search query
export const searchClients = async (query) => {
  let params = {}
  if (query.searchBy === 'name') {
    params.searchBy = query.searchBy
    params.firstName = query.firstName || ''
    params.lastName = query.lastName || ''
  } else if (query.searchBy === 'number') {
    params.searchBy = query.searchBy
    params.phoneNumber = query.phoneNumber || ''
  }
  return (await apiClient.get('/clients/search', { params })).data
}

// API call to POST new client
export const createClient = async (newClient) => (await apiClient.post('/clients', newClient)).data

// API call to PUT update client
export const updateClient = async (id, updatedClient) =>
  (await apiClient.put(`/clients/update/${id}`, updatedClient)).data

// API call to delete client
export const deleteClientbyId = async (id) => (await apiClient.delete(`/clients/${id}`)).data

// API call to get clients by zip code for dashboard
export const getClientsByZipCode = async () => (await apiClient.get('/clients/byzip')).data

// API calls related to services
// API call to get all services for org
export const getServices = async () => (await apiClient.get('/services/')).data

// API call to GET single service by ID
export const getServiceById = async (id) => (await apiClient.get(`/services/id/${id}`)).data

// API call to GET services based on search query
export const searchServices = async (query) => {
  let params = {}
  params.searchBy = query.searchBy
  if (query.searchBy === 'name') {
    params.name = query.name || ''
  } else if (query.searchBy === 'description') {
    params.description = query.description
  }
  return (await apiClient.get('/services/search', { params })).data
}

// API call to POST new service
export const createService = async (newService) => (await apiClient.post('/services', newService)).data

// API call to PUT update service
export const updateService = async (id, updatedService) =>
  (await apiClient.put(`/services/update/${id}`, updatedService)).data

// API call to DELETE service by ID
export const deleteService = async (id) => (await apiClient.delete(`/services/${id}`)).data
