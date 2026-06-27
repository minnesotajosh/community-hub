# Civic Hub — Multi-Tenant Community Ticketing

A demo MERN + Tailwind app for communities to raise and resolve local issues
("concerns") and escalate them into discussion "forums". Multi-tenant: users
only see their own community's data (except IAC Board / Top Admin).

See [SPEC.md](./SPEC.md) for the full data model and permission rules.

## Prerequisites
- Node 18+
- MongoDB running locally on `mongodb://127.0.0.1:27017`

## Setup
```bash
npm run install:all   # installs server + client deps
npm run seed          # creates test data (resets DB)
```

## Run (two terminals, or use the dev script)
```bash
npm run server        # API on http://localhost:4000
npm run client        # Web on http://localhost:5173
# or, with concurrently installed at root:
npm run dev
```
Open http://localhost:5173.

## Reset test data
Re-run any time to wipe + repopulate (handy while debugging):
```bash
npm run reset      # or: ./reset.sh
```

## Test accounts (password: `test`)
Use the **⚡ Dev quick-login dropdown** on the login screen to switch instantly.

| Role | Email | Scope |
|------|-------|-------|
| Top Level Admin | topadmin@test.com | everything |
| IAC Board Member | iacadmin@test.com | all communities in IAC |
| Hub Admin | hubadmin@test.com | Riverdale |
| Hub Moderator | hubmod@test.com | Riverdale |
| Member | member@test.com | Riverdale (Maplewood) |
| Hub Admin | summitadmin@test.com | Summit |
| Hub Moderator | summitmod@test.com | Summit |
| Members | dana@, omar@ (Riverdale), lena@, carlos@ (Summit) | respective hubs |

## What to try (verifying multi-tenancy + roles)
- Log in as **member@test.com**: see only Riverdale concerns; raise a concern (starts *pending*); cannot see Summit data; cannot comment on forums you're not invited to.
- Log in as **hubmod@test.com**: approve/deny/activate concerns, create forums, comment, close forums.
- Log in as **iacadmin@test.com**: see *both* communities; create new communities & cities.
- Log in as **summitadmin@test.com**: only Summit data — confirms tenant isolation.

## Structure
```
server/   Express + Mongoose API (JWT auth, RBAC, tenant scoping)
client/   Vite + React + Tailwind SPA
SPEC.md   Full specification
```
