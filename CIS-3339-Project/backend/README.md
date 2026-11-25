# Backend

Node.js + [Express](https://expressjs.com/) REST API using [MongoDB](https://www.mongodb.com/)
through [Mongoose](https://mongoosejs.com/). Requires **Node.js 18+**.

## Setup

```powershell
cd backend
npm install
npm run db:init    # organization, demo users, sample data (safe to run again)
npm start          # http://localhost:3000
```

There is no manual database setup anymore: the old `create_hash.js` utility and the hand-made
`org` / `users` documents are replaced by `npm run db:init`. Configuration lives in `backend/.env`,
which is **not committed** (the repo is public and it holds secrets): use the file submitted on
Canvas, or copy `.env.example` to `.env` and fill it in. Every variable is explained in the
[root README](../README.md#environment-files).

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the API (`node app.js`) |
| `npm run dev` | Start with nodemon, restarting on file changes |
| `npm run db:init` | Check `.env`, create indexes, the `ORG_ID` organization, the viewer/editor accounts (bcrypt hashed) and sample data. Never deletes anything; running it again creates no duplicates. Exit code 1 on any configuration or connection problem. |
| `npm run db:reset` | **Destructive.** Deletes the clients, events, services and users of `ORG_ID` and the isolation test org, then runs `db:init`. |
| `npm run db:status` | **Read-only.** Connects to `MONGO_URL` and reports whether the database is ready: connection time, the organization, both demo logins (account, role and password), record counts, the isolation test org and the unique username index. Changes nothing. Exit code 1 if anything is missing. |
| `npm run verify` | With the API running: checks the auth, role, organization isolation, registration, error shape, health and CORS rules over HTTP and prints PASS/FAIL. Use `API_URL=...` for a deployed API. |
| `npm run lint` | ESLint + Prettier |

## How a request is protected

```text
request -> CORS (CORS_ORIGIN only) -> requireAuth (401) -> requireRole('editor') (403, writes only)
        -> route handler -> Mongoose query wrapped in withOrg(filter, req) -> errorHandler ({ error })
```

- `middleware/auth.js`: `requireAuth`, `requireRole(...roles)`
- `utils/withOrg.js`: adds `{ orgId: req.user.orgId }` (from the verified token) to every query
- `utils/http.js`: `HttpError`, `asyncHandler` (forwards async errors), `isValidId`,
  `escapeRegex` (safe search), `pickFields` (stops a request from setting `_id` / `orgId`)
- `middleware/errorHandler.js`: unknown routes -> 404; every error -> `{ "error": "..." }` with
  400 / 401 / 403 / 404 / 409 / 500, never a stack trace

## Endpoints

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health` | public |
| GET | `/org` | public (organization name for the nav bar) |
| POST | `/users/login` | public |
| GET | `/clients`, `/clients/id/:id`, `/clients/search`, `/clients/byzip` | logged in |
| POST | `/clients` | editor |
| PUT | `/clients/update/:id` | editor |
| DELETE | `/clients/:id` (409 if registered for events) | editor |
| GET | `/events`, `/events/id/:id`, `/events/search`, `/events/client/:id`, `/events/client/:id/not-registered`, `/events/attendees/:id`, `/events/service/:id`, `/events/attendance` | logged in |
| POST | `/events` | editor |
| PUT | `/events/update/:id` | editor |
| PUT | `/events/register?event=&client=`, `/events/deregister?event=&client=` | editor |
| DELETE | `/events/:id` (409 if it has attendees) | editor |
| GET | `/services`, `/services/id/:id`, `/services/search` | logged in |
| POST | `/services` | editor |
| PUT | `/services/update/:id` | editor |
| DELETE | `/services/:id` (409 if used by an event) | editor |

Search parameters: clients `searchBy=name&firstName=&lastName=` or `searchBy=number&phoneNumber=`;
events `searchBy=name&name=` or `searchBy=date&eventDate=YYYY-MM-DD`; services
`searchBy=name&name=` or `searchBy=description&description=`.

## Data model notes

Every client, event, service and user has a single `orgId` field (the template mixed `org` and an
`orgs` array). An event's registrations are the client ids in its `attendees` array; the register
route adds them with `$addToSet`, so the same client can't appear twice.
