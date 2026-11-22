# Data Platform Frontend

This project uses [VueJS 3](https://vuejs.org/) with [Vite](https://vitejs.dev/) and [TailwindCSS](https://tailwindcss.com/).
For form validation [Vuelidate](https://vuelidate-next.netlify.app/) is used.

State management is done via [Pinia](https://pinia.vuejs.org/).

## Project setup

    npm install

### Before startup
You need to either have a local backend running and or use a cloud deployed backend.

`frontend/.env` is not committed (`.env` files are ignored because the repo is public). Use the
file submitted on Canvas, or copy `.env.example` to `.env`. It points at a local backend:

    VITE_ROOT_API=http://localhost:3000

VITE_ROOT_API is the URL for the backend API, either on localhost or in the cloud. Vite reads it
at build time, so after changing it (for example to the deployed backend URL) re-run `npm run build`.
### Compiles and hot-reloads for development

    npm run dev

### Production build (D2)

    npm run build     # writes dist/ (exit code 0)
    npm run serve     # serves dist/ at http://localhost:5173 - use this for the demo

- `VITE_ROOT_API` is read **when you build**. To build for a deployed backend, set it before
  building, e.g. PowerShell `$env:VITE_ROOT_API="https://your-api.onrender.com"; npm run build`,
  or set it as an environment variable on the hosting service. No URL is hard-coded in the code.
- The router uses HTML5 history mode, so the static host needs an SPA fallback (every unknown
  path -> `index.html`). `public/_redirects` does this on Netlify, `render.yaml` on Render, and
  `npm run serve` does it locally. See the root README, "Deployment".
- `base: '/'` in `vite.config.js` keeps asset URLs absolute, so refreshing a nested route like
  `/clientdetails/<id>` still finds `/assets/...`.
- `npm run dev` and `npm run serve` both use port 5173, the origin allowed by the backend's
  `CORS_ORIGIN`.

### Demo users (created by `npm run db:init` in the backend)

| Role   | Username | Password |
| ------ | -------- | -------- |
| Viewer | `user`   | `user`   |
| Editor | `admin`  | `admin`  |

### Backend contracts the frontend relies on

The Sprint 2 mock API was removed in Sprint 3; every call now goes to the real backend, which
implements these responses:

| Contract | Response |
| --- | --- |
| Any client/event/service route without a valid token | `401` (the interceptor logs the user out and opens `/login`) |
| A viewer calling a create, update, delete, register or deregister route | `403` |
| Failed login (bad username *or* bad password) | `400 { "error": "Invalid username or password" }` |
| `PUT /events/register?event=&client=`, first call | `200 { "eventId", "clientId" }` |
| `PUT /events/register`, client already registered | `200 { "message": "Already registered" }` |
| `PUT /events/deregister?event=&client=`, first call | `200 { "eventId", "clientId" }` |
| `PUT /events/deregister`, client not registered | `200 { "message": "Not registered" }` |
| Register/deregister with a missing client or event (or one from another org) | `404` |
| Any error | `{ "error": "Human readable message" }` |
