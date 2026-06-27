# Civic Hub — Multi-Tenant Community Ticketing System — SPEC

A multi-tenant ticketing platform for communities to raise and resolve local issues.
Stack: **MERN + Tailwind** (MongoDB, Express, React/Vite, Node).

---

## 1. User Roles (descending seniority)

| # | Role key | Label | Capabilities |
|---|----------|-------|--------------|
| 1 | `top_admin` | Top Level Admin | Add/modify ALL user types; add/modify/remove all user-editable data. Global, cross-tenant. |
| 2 | `iac_board` | IAC Board Member | Manage communities under IAC jurisdiction: add/remove communities, add cities, add/remove community hub admins (managers). Cross-community within IAC. |
| 3 | `hub_admin` | Community Hub Admin | Manage a community hub directly: escalate & close tickets, create/manage forums, manage regular member accounts (add/remove members). |
| 4 | `hub_moderator` | Community Hub Moderator | Escalated user. No add/remove of members. Can approve/deny/activate/close concerns, create forums & comment. |
| 5 | `member` | Community Hub Member | The core user. Raise concerns; comment on escalated tickets (forums) they're invited to; star concerns & comments. |

**IAC** = "Internet Age Community", a large US region. Communities live under an IAC.

### User fields (all users)
- `name`
- `email` (unique, login)
- `password` (hashed)
- `role` (one of the keys above)
- `bio` (description)
- `profileImage` (URL/string; optional)
- `city` (ref City) — except `top_admin` / `iac_board` which are not bound to a single city
- `community` (ref Community) — derived/denormalized from city for tenant scoping

---

## 2. Multi-Tenancy / Visibility Rules

- Each **City** belongs to exactly one **Community**.
- Each member belongs to a **City** -> therefore a **Community** (their "hub").
- Members and hub staff (admin/mod) only see concerns/forums raised by users within **their own community** (their hub).
- `top_admin` and `iac_board` can see across communities (board = within their IAC; top = everything).
- All API queries for non-privileged roles are filtered by `community`.

---

## 3. Data Structures

### 3.1 Concern (a ticket)
A ticket a user raises about their local community, visible to other users in their hub.
- `title`
- `tag` (one of predefined: `finance`, `safety`, `infrastructure`, `policy`, `parks_rec`, `environment`, `housing`, `other`)
- `author` (ref User)
- `community` (ref Community) — tenant scope
- `city` (ref City)
- `description` (rich text / HTML)
- `stars` (array of user refs; count = importance signal)
- `status`: `pending` (pending approval) | `denied` | `approved` | `active` (linked into a forum)
- `closed` (bool) + `closedAt` — resolved
- `forum` (ref Forum, nullable) — set when active/linked
- `images` (optional, array of strings) — nice-to-have
- `createdAt`

**Workflow:** Any user creates a concern -> starts `pending`. A hub admin/moderator approves (`approved`) or denies (`denied`). A mod/admin can mark it `active` (links to a forum) or `closed` when resolved.

### 3.2 Forum (escalated ticket)
Created by hub admin/moderator. Links several concerns; thread of comments.
- `title`
- `tag` (same predefined list)
- `description` (rich text)
- `author` (ref User — admin/mod)
- `community` (ref Community)
- `linkedConcerns` (array of Concern refs)
- `invitedUsers` (array of User refs) — members allowed to comment (in addition to staff)
- `comments` (array of Comment subdocs)
- `status`: `open` | `closed`
- `resolutionSummary` (rich text) — set when closed: actions taken / next steps
- `closedAt`
- `createdAt`

**Comment (subdoc):**
- `author` (ref User)
- `body` (rich text)
- `stars` (array of user refs)
- `createdAt`, `updatedAt`

**Comment rules:** All users (in community) can VIEW a forum. Only staff (admin/mod) + `invitedUsers` can ADD comments. A user can edit/delete their OWN comments and star/unstar OTHERS' comments. When admin/mod closes the forum they provide a `resolutionSummary`; linked concerns can be marked closed.

### 3.3 Community (tenant)
- `name` (created by IAC board / top admin)
- `description`
- `iac` (string/region name for now)
- cities are separate docs referencing the community.

### 3.4 City
- `name`
- `description`
- `community` (ref Community)

---

## 4. Permissions Matrix (summary)

| Action | top_admin | iac_board | hub_admin | hub_moderator | member |
|--------|:--:|:--:|:--:|:--:|:--:|
| Manage all users | ✓ | | | | |
| Create/remove community | ✓ | ✓ | | | |
| Add city to community | ✓ | ✓ | | | |
| Edit city info | ✓ | ✓ | ✓ | | |
| Add/remove hub admins | ✓ | ✓ | | | |
| Add/remove members | ✓ | ✓ | ✓ | | |
| Create concern | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve/deny concern | ✓ | ✓ | ✓ | ✓ | |
| Activate/close concern | ✓ | ✓ | ✓ | ✓ | |
| Create/close forum | ✓ | ✓ | ✓ | ✓ | |
| Invite users to forum | ✓ | ✓ | ✓ | ✓ | |
| Comment on forum | ✓ | ✓ | ✓ | ✓ | invited only |
| Star concern/comment | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 5. Tech Notes
- Backend: Express + Mongoose, JWT auth, bcrypt. RBAC middleware (`requireRole`, tenant scoping helper).
- Frontend: Vite + React + React Router + Tailwind. Axios. Rich text via a simple textarea/contenteditable (HTML stored).
- Dev convenience: **login screen dropdown** to pick a seeded account (auto-fills email + password "test").
- Seed: 1 of each role; 2 communities x 2 cities; multiple members; concerns + forums with comments/stars.
- Scripts: `npm run seed` (reset + populate). Idempotent — drops collections first.

## 6. Seeded Accounts (all password: `test`)
- top_admin: topadmin@test.com
- iac_board: iacadmin@test.com
- hub_admin: hubadmin@test.com
- hub_moderator: hubmod@test.com
- member: member@test.com
- plus extra members per city to simulate activity.
