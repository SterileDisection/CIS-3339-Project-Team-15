# Data Platform Frontend

This project uses [VueJS 3](https://vuejs.org/) with [Vite](https://vitejs.dev/) and [TailwindCSS](https://tailwindcss.com/).
For form validation [Vuelidate](https://vuelidate-next.netlify.app/) is used.

State management is done via [Pinia](https://pinia.vuejs.org/).

## Project setup

    npm install

### Before startup
You need to either have a local backend running and or use a cloud deployed backend.

The committed `frontend/.env` already points at a local backend:

    VITE_ROOT_API=http://localhost:3000

VITE_ROOT_API is the URL for the backend API, either on localhost or in the cloud. Vite reads it
at build time, so after changing it (for example to the deployed backend URL) re-run `npm run build`.
### Compiles and hot-reloads for development

    npm run dev

### Running without the backend (mock API)

    npm run dev:mock

This starts the same dev server, but every API call is answered by an in-memory mock backend
(`src/api/mockApi.js`) instead of `VITE_ROOT_API`. It's switched on by Vite's `mock` mode, so
`npm run dev` never loads it and `npm run build` leaves it out of the bundle entirely.

| Role   | Username | Password |
| ------ | -------- | -------- |
| Viewer | `user`   | `user`   |
| Editor | `admin`  | `admin`  |

The mock has 16 clients, 16 events and 16 services. Its data resets on a full page reload.

The mock follows the API contracts agreed for S1 and B1, so the frontend already handles the
responses the Sprint 3 backend has to send:

| Contract | Response |
| --- | --- |
| Any client/event/service route without a valid token | `401` |
| A viewer calling a create, update, delete, register or deregister route | `403` |
| Failed login (bad username *or* bad password) | `400 { "error": "Invalid username or password" }` |
| `PUT /events/register?event=&client=`, first call | `200 { "eventId", "clientId" }` |
| `PUT /events/register`, client already registered | `200 { "message": "Already registered" }` |
| `PUT /events/deregister?event=&client=`, first call | `200 { "eventId", "clientId" }` |
| `PUT /events/deregister`, client not registered | `200 { "message": "Not registered" }` |
| Register/deregister with a missing client or event (or one from another org) | `404` |
| Any error | `{ "error": "Human readable message" }` |

To retire the mock once the real backend matches these contracts, delete `src/api/mockApi.js`,
the `dev:mock` script, and the `useMockApi` lines at the top of `src/api/api.js`.
