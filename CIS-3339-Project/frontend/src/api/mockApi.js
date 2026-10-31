// Sprint 2: in-memory mock backend (development only)
//
// `npm run dev:mock` runs Vite in "mock" mode, and api.js then hands every request to mockAdapter()
// below instead of sending it over the network. `npm run dev` and `npm run build` never load this file.
//
// It answers with the same routes and response shapes as the real backend, plus the agreed
// Sprint 3 contracts the real backend doesn't implement yet:
//   S1: 401 without a valid token; 403 when a viewer calls a create, update, delete, register or
//       deregister route; the same "Invalid username or password" message for any failed login
//   B1: register/deregister return the { eventId, clientId } record on the first call,
//       { message: 'Already registered' } / { message: 'Not registered' } when nothing changes,
//       and 404 when the client or the event doesn't exist
//   B2: every error body is { error: 'Human readable message' }
//
// Swapping it out later: use `npm run dev` against the real backend, or delete this file, the
// dev:mock script and the useMockApi lines in api.js. Nothing else depends on it.
// The data lives in memory, so it resets on a full page reload.
import { AxiosError } from 'axios'

// demo accounts, same usernames/passwords the D1 seed script has to create
const USERS = [
  { username: 'user', password: 'user', name: 'Demo Viewer', role: 'viewer' },
  { username: 'admin', password: 'admin', name: 'Demo Editor', role: 'editor' }
]
const ORG_NAME = 'Mock Community Health Org'
const DAY = 24 * 60 * 60 * 1000
// short delay so the loading states are visible
const LATENCY_MS = 300

// ---------------------------------------------------------------------------
// seed data: 16 rows per list, so DataTable sorting and paging (10 per page) can be tested
// ---------------------------------------------------------------------------

// Mongo-style 24 character hex ids
let lastId = 0
const newId = () => (++lastId).toString(16).padStart(24, '0')

const PLACES = [
  ['Houston', 'Harris', '77002'],
  ['Houston', 'Harris', '77004'],
  ['Pasadena', 'Harris', '77506'],
  ['Katy', 'Fort Bend', '77449'],
  ['Sugar Land', 'Fort Bend', '77478'],
  ['Pearland', 'Brazoria', '77581']
]
const placeAt = (i) => {
  const [city, county, zip] = PLACES[i % PLACES.length]
  return { city, county, zip }
}

const FIRST_NAMES = ['Maria', 'James', 'Linh', 'Carlos', 'Aisha', 'David', 'Sofia', 'Kevin',
  'Fatima', 'Luis', 'Grace', 'Omar', 'Elena', 'Tyler', 'Priya', 'Marcus']
const LAST_NAMES = ['Garcia', 'Johnson', 'Nguyen', 'Hernandez', 'Khan', 'Smith', 'Lopez', 'Brown',
  'Ali', 'Martinez', 'Kim', 'Hassan', 'Rossi', 'Davis', 'Patel', 'Lee']

const clients = FIRST_NAMES.map((firstName, i) => ({
  _id: newId(),
  firstName,
  middleName: '',
  lastName: LAST_NAMES[i],
  email: `${firstName}.${LAST_NAMES[i]}@example.com`.toLowerCase(),
  phoneNumber: { primary: `713555${String(1000 + i * 37).slice(-4)}`, alternate: '' },
  address: { line1: `${100 + i * 12} Main St`, line2: '', ...placeAt(i) }
}))

const SERVICE_INFO = [
  ['Blood Pressure Screening', 'Free blood pressure checks with follow-up guidance'],
  ['Diabetes Education', 'Classes on managing blood sugar, diet and medication'],
  ['Flu Shots', 'Seasonal flu vaccinations for adults and children'],
  ['Nutrition Counseling', 'One-on-one meal planning with a nutritionist'],
  ['Mental Health Support', 'Peer support groups and counselor referrals'],
  ['Dental Screening', 'Basic dental checkups and hygiene kits'],
  ['Vision Screening', 'Eye exams and referrals for glasses'],
  ['Health Insurance Enrollment', 'Help signing up for Medicaid, CHIP or marketplace plans'],
  ['Food Pantry', 'Weekly groceries for families in need'],
  ['Prenatal Care Referral', 'Connecting expecting mothers with prenatal clinics'],
  ['COVID-19 Testing', 'Rapid and PCR testing'],
  ['Smoking Cessation', 'Coaching and resources to quit tobacco'],
  ['Senior Wellness Check', 'Health checks and fall-risk screening for seniors'],
  ['Childhood Immunizations', 'Routine vaccines for school-age children'],
  ['Exercise Class', 'Low-impact group fitness for all ages'],
  ['Housing Assistance Referral', 'Referrals to local housing and rent assistance programs']
]
const services = SERVICE_INFO.map(([name, description], i) => ({
  _id: newId(),
  name,
  description,
  // a couple of inactive services, so the "Inactive" checkbox state shows up on events
  status: i % 7 === 6 ? 'Inactive' : 'Active'
}))

const EVENT_NAMES = ['Spring Health Fair', 'Diabetes Workshop', 'Back to School Vaccines',
  'Senior Wellness Day', 'Community Food Drive', 'Heart Health Talk', 'Family Fitness Morning',
  'Mental Health Awareness Night', 'Flu Shot Clinic', 'Insurance Enrollment Day',
  'Healthy Cooking Demo', 'Vision and Dental Day', 'Prenatal Info Session', 'Quit Smoking Kickoff',
  'Neighborhood Health Walk', 'Winter Wellness Fair']
const events = EVENT_NAMES.map((name, i) => ({
  _id: newId(),
  name,
  description: `${name} hosted by the community health team`,
  // one event a week, from 7 weeks ago to 8 weeks ahead
  date: new Date(Date.now() + (i - 7) * 7 * DAY).toISOString(),
  address: { line1: `${200 + i * 15} Community Ave`, line2: '', ...placeAt(i + 2) },
  services: [services[i]._id, services[(i + 3) % services.length]._id],
  // every event starts with a few attendees, so there is at least one registration
  attendees: clients.filter((client, c) => (c + i) % 4 === 0).map((client) => client._id)
}))

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// copies records on the way out, so a view editing a form can't change the "database" before saving
const copy = (value) => JSON.parse(JSON.stringify(value))
const contains = (text, search) => String(text || '').toLowerCase().includes(String(search || '').toLowerCase())

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function findOr404(list, id, label) {
  const record = list.find((item) => item._id === id)
  if (!record) throw new HttpError(404, `${label} not found`)
  return record
}

function requireFields(body, fields) {
  for (const [path, label] of fields) {
    const value = path.split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), body)
    if (value == null || value === '') throw new HttpError(400, `${label} is required`)
  }
}

// tokens look like real JWTs (header.payload.signature) so jwt-decode and the F4 expiry check work
const base64Url = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
function makeToken(user) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ name: user.name, role: user.role, exp })}.mock`
}

// returns { name, role } for a valid, unexpired token, or null
function readUser(config) {
  const header = config.headers?.get?.('Authorization') ?? config.headers?.Authorization
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/, '') : ''
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')))
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return null
    return payload
  } catch (error) {
    return null
  }
}

// ---------------------------------------------------------------------------
// routes: same paths as backend/routes/*.js
// options: auth = needs a valid token (requireAuth), editor = needs the editor role (requireRole)
// ---------------------------------------------------------------------------

const routes = []
function route(method, path, handler, { auth = true, editor = false } = {}) {
  const keys = []
  const pattern = path.replace(/:(\w+)/g, (match, key) => {
    keys.push(key)
    return '([^/]+)'
  })
  routes.push({ method, regex: new RegExp(`^${pattern}/?$`), keys, handler, auth, editor })
}
const READ = { auth: true }
const WRITE = { auth: true, editor: true }

// login + org
route('post', '/users/login', ({ body }) => {
  const user = USERS.find((u) => u.username === body.username && u.password === body.password)
  // S1: one message for a wrong username and a wrong password
  if (!user) throw new HttpError(400, 'Invalid username or password')
  return { token: makeToken(user) }
}, { auth: false })

route('get', '/org', () => ORG_NAME, { auth: false })

// events
route('get', '/events', () => copy(events), READ)
route('get', '/events/attendance', () => {
  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
  return copy(events
    .filter((event) => new Date(event.date) >= twoMonthsAgo)
    .sort((a, b) => new Date(a.date) - new Date(b.date)))
}, READ)
route('get', '/events/id/:id', ({ params }) => copy(findOr404(events, params.id, 'Event')), READ)
route('get', '/events/search', ({ query }) => {
  if (query.searchBy === 'name') return copy(events.filter((event) => contains(event.name, query.name)))
  if (query.searchBy === 'date') {
    return copy(events.filter((event) => event.date.slice(0, 10) === query.eventDate))
  }
  throw new HttpError(400, 'Invalid searchBy')
}, READ)
route('get', '/events/client/:id', ({ params }) =>
  copy(events.filter((event) => event.attendees.includes(params.id))), READ)
route('get', '/events/client/:id/not-registered', ({ params }) =>
  copy(events.filter((event) => !event.attendees.includes(params.id))), READ)
route('get', '/events/attendees/:id', ({ params }) => {
  const event = findOr404(events, params.id, 'Event')
  return copy(clients.filter((client) => event.attendees.includes(client._id)))
}, READ)
route('get', '/events/service/:id', ({ params }) =>
  copy(events
    .filter((event) => event.services.includes(params.id))
    .map(({ _id, name, date, address }) => ({ _id, name, date, address: { line1: address.line1 } }))), READ)
route('post', '/events', ({ body }) => {
  requireFields(body, [['name', 'Event name'], ['date', 'Event date']])
  events.push({ services: [], attendees: [], ...copy(body), _id: newId() })
  return 'New event created successfully'
}, WRITE)
route('put', '/events/update/:id', ({ params, body }) => {
  const event = findOr404(events, params.id, 'Event')
  requireFields(body, [['name', 'Event name'], ['date', 'Event date']])
  Object.assign(event, copy(body), { _id: event._id })
  return 'Event updated successfully'
}, WRITE)

// B1: register / deregister, following the agreed rules
route('put', '/events/register', ({ query }) => {
  const event = events.find((e) => e._id === query.event)
  const client = clients.find((c) => c._id === query.client)
  // rule 1: both have to exist (and, on the real backend, belong to the user's organization)
  if (!event || !client) throw new HttpError(404, 'Client or event not found')
  // rule 2: no duplicates
  if (event.attendees.includes(client._id)) return { message: 'Already registered' }
  event.attendees.push(client._id)
  return { eventId: event._id, clientId: client._id }
}, WRITE)
route('put', '/events/deregister', ({ query }) => {
  const event = events.find((e) => e._id === query.event)
  const client = clients.find((c) => c._id === query.client)
  if (!event || !client) throw new HttpError(404, 'Client or event not found')
  // rule 3: not being registered isn't an error
  if (!event.attendees.includes(client._id)) return { message: 'Not registered' }
  event.attendees = event.attendees.filter((id) => id !== client._id)
  return { eventId: event._id, clientId: client._id }
}, WRITE)
route('delete', '/events/:id', ({ params }) => {
  const event = findOr404(events, params.id, 'Event')
  events.splice(events.indexOf(event), 1)
  return 'Event deleted successfully'
}, WRITE)

// clients
const CLIENT_REQUIRED = [['firstName', 'First name'], ['lastName', 'Last name'],
  ['phoneNumber.primary', 'Primary phone number'], ['address.city', 'City']]
route('get', '/clients', () => copy(clients), READ)
route('get', '/clients/byzip', () => {
  const counts = {}
  clients.filter((c) => c.address.zip).forEach((c) => (counts[c.address.zip] = (counts[c.address.zip] || 0) + 1))
  return Object.entries(counts).map(([zip, count]) => ({ _id: zip, count }))
}, READ)
route('get', '/clients/id/:id', ({ params }) => copy(findOr404(clients, params.id, 'Client')), READ)
route('get', '/clients/search', ({ query }) => {
  if (query.searchBy === 'name') {
    return copy(clients.filter((c) => contains(c.firstName, query.firstName) && contains(c.lastName, query.lastName)))
  }
  if (query.searchBy === 'number') {
    return copy(clients.filter((c) => contains(c.phoneNumber.primary, query.phoneNumber)))
  }
  throw new HttpError(400, 'Invalid searchBy')
}, READ)
route('post', '/clients', ({ body }) => {
  requireFields(body, CLIENT_REQUIRED)
  clients.push({ ...copy(body), _id: newId() })
  return 'New client created successfully'
}, WRITE)
route('put', '/clients/update/:id', ({ params, body }) => {
  const client = findOr404(clients, params.id, 'Client')
  requireFields(body, CLIENT_REQUIRED)
  Object.assign(client, copy(body), { _id: client._id })
  return 'Client updated successfully'
}, WRITE)
route('delete', '/clients/:id', ({ params }) => {
  const client = findOr404(clients, params.id, 'Client')
  clients.splice(clients.indexOf(client), 1)
  // a deleted client can't stay registered for events
  events.forEach((event) => (event.attendees = event.attendees.filter((id) => id !== client._id)))
  return 'Client deleted successfully'
}, WRITE)

// services
route('get', '/services', () => copy(services), READ)
route('get', '/services/id/:id', ({ params }) => copy(findOr404(services, params.id, 'Service')), READ)
route('get', '/services/search', ({ query }) => {
  if (query.searchBy === 'name') return copy(services.filter((s) => contains(s.name, query.name)))
  if (query.searchBy === 'description') return copy(services.filter((s) => contains(s.description, query.description)))
  throw new HttpError(400, 'Invalid searchBy')
}, READ)
route('post', '/services', ({ body }) => {
  requireFields(body, [['name', 'Service name']])
  services.push({ status: 'Active', ...copy(body), _id: newId() })
  return 'New service created successfully'
}, WRITE)
route('put', '/services/update/:id', ({ params, body }) => {
  const service = findOr404(services, params.id, 'Service')
  requireFields(body, [['name', 'Service name']])
  Object.assign(service, copy(body), { _id: service._id })
  return 'Service updated successfully'
}, WRITE)
route('delete', '/services/:id', ({ params }) => {
  const service = findOr404(services, params.id, 'Service')
  services.splice(services.indexOf(service), 1)
  return 'Service deleted successfully'
}, WRITE)

// ---------------------------------------------------------------------------
// axios adapter: turns a request config into a response, or rejects with an AxiosError that
// carries the response, exactly like a real HTTP failure, so the api.js interceptor handles it
// ---------------------------------------------------------------------------

export async function mockAdapter(config) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

  const method = (config.method || 'get').toLowerCase()
  const path = config.url.split('?')[0]
  const query = config.params || {}
  const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : config.data || {}

  let status = 200
  let data
  try {
    let params = null
    const match = routes.find((r) => {
      if (r.method !== method) return false
      const found = path.match(r.regex)
      if (found) params = Object.fromEntries(r.keys.map((key, i) => [key, decodeURIComponent(found[i + 1])]))
      return Boolean(found)
    })
    if (!match) throw new HttpError(404, `Not found: ${method.toUpperCase()} ${path}`)

    const user = readUser(config)
    // S1: requireAuth -> 401, requireRole('editor') -> 403
    if (match.auth && !user) throw new HttpError(401, 'Token is not valid')
    if (match.editor && user.role !== 'editor') throw new HttpError(403, 'Only editors can do that')

    data = match.handler({ params, query, body, user })
  } catch (error) {
    // anything that isn't an HttpError is a bug in this mock, so let it surface
    if (!(error instanceof HttpError)) throw error
    status = error.status
    data = { error: error.message }
  }

  const response = { data, status, statusText: String(status), headers: {}, config, request: {} }
  if (status < 400) return response
  throw new AxiosError(data.error, AxiosError.ERR_BAD_REQUEST, config, response.request, response)
}
