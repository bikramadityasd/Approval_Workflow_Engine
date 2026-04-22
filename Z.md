# Approval Workflow Engine — Build Guide

A self-contained roadmap for building this project. Read top to bottom. Each phase leaves you with something runnable before moving on.

---

## 0. Setup on a fresh machine

Use this when you clone the repo on a new laptop / VM.

### 0.1 Prerequisites

Install once per machine:

- **Node.js** 20 or newer — check with `node -v`. Install from nodejs.org or via `nvm`.
- **npm** — ships with Node.
- **Git** — `git --version`.
- **Docker Desktop** (recommended) — easiest way to get Postgres. Verify with `docker --version` and `docker compose version`.
- **Postgres 16** (alternative to Docker) — if you prefer a native install. Docker is simpler.

### 0.2 Clone the repo

```bash
git clone <your-github-url>.git approval-workflow-engine
cd approval-workflow-engine
```

### 0.3 Install dependencies

```bash
npm install
```

This reads `package.json` and pulls express, prisma, zod, etc. into `node_modules/`.

### 0.4 Create `.env`

The repo ignores `.env` (good — don't commit secrets). Create one at the project root:

```bash
cp .env.example .env   # if .env.example exists
# or create manually:
```

`.env` contents:

```
DATABASE_URL="postgresql://user:password@localhost:35432/db"
PORT=3000
```

Adjust `user`, `password`, `db`, and the port to whatever your Postgres is using. The example above matches the commented `docker run` in the `Dockerfile`.

**Tip:** commit a `.env.example` (with placeholder values, no secrets) so future-you remembers what vars exist.

### 0.5 Start Postgres

**Option A — Docker (recommended):**

```bash
docker run -d --name approval-db \
  -p 35432:5432 \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=db \
  postgres:16.13
```

Verify it's up: `docker ps` should show `approval-db` on port 35432.

To stop: `docker stop approval-db`. To restart: `docker start approval-db`. To wipe and start over: `docker rm -f approval-db` then re-run the `docker run` above.

**Option B — docker-compose** (if you add a `docker-compose.yml` later):

```bash
docker compose up -d db
```

**Option C — native Postgres:** create a database and user matching your `DATABASE_URL`.

### 0.6 Run migrations

```bash
npx prisma migrate dev
```

This applies every migration in `prisma/migrations/` to your database and runs `prisma generate` so TypeScript types resolve.

If you see a drift error because migrations were authored against a different DB, the safest reset in dev is:
```bash
npx prisma migrate reset   # DROPS ALL DATA, re-runs migrations, re-seeds if seed exists
```
Never run `migrate reset` against a real database.

### 0.7 Start the dev server

```bash
npm run dev
```

If `dev` isn't defined yet in `package.json`, add this under `"scripts"`:

```json
"dev": "tsx watch src/server.ts",
"start": "tsx src/server.ts"
```

`tsx watch` reruns on file save. Hit `http://localhost:3000/health` — should respond `{ "status": "ok" }` once Slice 1 is built.

### 0.8 Everyday workflow

```bash
git pull                     # grab latest changes
npm install                  # only if package.json changed
npx prisma migrate dev       # only if prisma/migrations/ changed
npm run dev                  # start coding
```

### 0.9 Common setup errors

| Error | Fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:35432` | Postgres isn't running. `docker start approval-db`. |
| `P1001: Can't reach database server` | `DATABASE_URL` host/port wrong, or Postgres not started. |
| `P3005: database schema is not empty` | DB has tables Prisma didn't create. Use a fresh DB or `migrate reset`. |
| `Cannot find module '@prisma/client'` | Run `npx prisma generate`. |
| `Environment variable not found: DATABASE_URL` | `.env` missing or not loaded. Make sure `dotenv/config` is imported at the top of `server.ts`, or run via a loader that picks it up. |
| Port 3000 already in use | Change `PORT` in `.env`, or kill the old process (`lsof -i :3000`). |

### 0.10 Pushing changes

```bash
git add .
git commit -m "feat: something meaningful"
git push
```

Before committing, double-check `git status` doesn't show `.env`, `node_modules/`, or `src/generated/`. If it does, your `.gitignore` is missing entries — fix it.

---

## 1. Mental model (read this first)

A **Request** is something a user wants approved (expense, leave, purchase). It has a title, amount, and an overall `status` (PENDING / APPROVED / REJECTED).

An **Approval** is one step in the chain. A request has many approvals, ordered by `stepOrder` (1, 2, 3…). Each approval has its own `status`. The request's overall status is derived from its chain:

- Any approval REJECTED → request is REJECTED.
- All approvals APPROVED → request is APPROVED.
- Otherwise → request is PENDING, and the "current approver" is the first PENDING approval when sorted by `stepOrder`.

**The single most important rule:** only the **current approver** can act. Earlier steps are already done. Later steps aren't their turn yet. This rule is why the `stepOrder` column exists.

---

## 2. Folder layout

```
src/
  server.ts                  entry point — creates Express app, mounts routes, starts listening
  prisma.ts                  exports ONE shared PrismaClient instance
  routes/
    userRoutes.ts            router for /users
    requestRoutes.ts         router for /requests
  controllers/
    userController.ts        HTTP layer: parse body, call service, format response
    requestController.ts
  services/
    userService.ts           business logic + Prisma calls
    requestService.ts
  schema/
    userSchema.ts            Zod input validation
    requestSchema.ts
  middleware/
    auth.ts                  reads x-user-id header, attaches acting user to req
    errorHandler.ts          catches thrown errors, returns JSON
prisma/
  schema.prisma              DB schema
  migrations/                auto-generated
```

**Why this structure:**
- **Routes** decide URL → controller function. No logic.
- **Controllers** speak HTTP: parse input with Zod, call a service, send JSON. **Never import Prisma here.**
- **Services** do the real work: DB calls, business rules, throw errors.
- **Zod schemas** are input validation, separate from Prisma types.
- **Middleware** handles cross-cutting concerns: auth, errors, logging.

This separation is what the assignment means by "clean code structure, separation of concerns."

---

## 3. Prisma schema — final shape

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String       @id @default(uuid())
  name        String
  email       String       @unique
  designation Designation
  createdAt   DateTime     @default(now())
  requests    Request[]
  approvals   Approval[]
}

model Request {
  id         String     @id @default(uuid())
  title      String
  amount     Float
  status     Status     @default(PENDING)
  userId     String
  user       User       @relation(fields: [userId], references: [id])
  approvals  Approval[]
  createdAt  DateTime   @default(now())
}

model Approval {
  id         String    @id @default(uuid())
  requestId  String
  approverId String
  stepOrder  Int
  status     Status    @default(PENDING)
  actedAt    DateTime?
  comment    String?
  createdAt  DateTime  @default(now())
  request    Request   @relation(fields: [requestId], references: [id])
  approver   User      @relation(fields: [approverId], references: [id])

  @@unique([requestId, stepOrder])
}

enum Status {
  PENDING
  APPROVED
  REJECTED
}

enum Designation {
  MANAGER
  HR
  EMPLOYEE
}
```

**Critical details:**
- Use `provider = "prisma-client-js"` and import from `@prisma/client`. Don't use a custom `output` path — it only complicates imports.
- `@@unique([requestId, stepOrder])` is a **model-level** attribute. Two `@`s, on its own line, after all fields. It guarantees a request can't have two step-1 rows.
- `actedAt` is nullable — null means "hasn't been acted on yet."
- Don't store `assignedTo` on `Request`. "Who is it assigned to right now?" = "first PENDING approval." One source of truth.

### Migration steps

1. Delete any stale migration folder (e.g., `prisma/migrations/20260323075513_init/`).
2. Ensure `.env` has `DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"`.
3. Run `npx prisma migrate dev --name init`.
4. Run `npx prisma generate` (migrate usually does this, but run it if types don't resolve).

---

## 4. `src/prisma.ts` — one shared client

Create this file:

- `import { PrismaClient } from "@prisma/client"`
- Export a single `new PrismaClient()` instance.
- Import *this* in every service. Don't instantiate `PrismaClient` in multiple places.

**Why:** every `new PrismaClient()` opens its own connection pool. Multiple instances leak connections.

---

## 5. Build order — vertical slices

Build one endpoint end-to-end before moving to the next. After each slice, test with curl/Postman and see a row in the DB.

### Slice 1 — Server boots + health check

**File: `src/server.ts`**

1. Import express, dotenv/config, routers.
2. Create app, apply `express.json()`.
3. `GET /health` → `res.json({ status: "ok" })`.
4. `app.listen(process.env.PORT || 3000)`.

Run it. Hit `/health`. Move on only when this works.

### Slice 2 — Create + list users

**Files:**
- `src/schema/userSchema.ts` — Zod: `name` (string), `email` (email), `designation` (enum of MANAGER/HR/EMPLOYEE).
- `src/services/userService.ts` — `createUser(data)` → `prisma.user.create`. `listUsers()` → `prisma.user.findMany`.
- `src/controllers/userController.ts` — `createUserHandler(req, res)`:
  1. `const parsed = userSchema.parse(req.body)`.
  2. `const user = await userService.createUser(parsed)`.
  3. `res.status(201).json(user)`.
- `src/routes/userRoutes.ts` — `router.post("/", createUserHandler)`, `router.get("/", listUsersHandler)`.
- `server.ts` — `app.use("/users", userRoutes)`.

Test:
```
curl -X POST localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"a@b.com","designation":"MANAGER"}'
```

Create at least 3 users: one MANAGER, one HR, one EMPLOYEE. You'll need them next.

### Slice 3 — Create request (auto-generates approval chain)

**Hardest slice. Take your time.**

**Zod (`requestSchema.ts`):**
- `title` (non-empty string)
- `amount` (positive number)

**Service — `createRequest(userId, { title, amount })`:**

1. Find the approvers. Start with the simplest rule: one MANAGER and one HR.
   ```ts
   const manager = await prisma.user.findFirst({ where: { designation: "MANAGER" } });
   const hr      = await prisma.user.findFirst({ where: { designation: "HR" } });
   if (!manager || !hr) throw new Error("Approval chain cannot be built");
   ```
2. (Optional rule to mention in README) If `amount > 10000`, add a second manager or a CFO step.
3. Insert in a **single transaction:**
   ```ts
   return prisma.$transaction(async (tx) => {
     const request = await tx.request.create({
       data: { title, amount, userId },
     });
     await tx.approval.createMany({
       data: [
         { requestId: request.id, approverId: manager.id, stepOrder: 1 },
         { requestId: request.id, approverId: hr.id,      stepOrder: 2 },
       ],
     });
     return request;
   });
   ```
   **Why a transaction:** if `createMany` fails after the request row is inserted, you'd have a zombie request with no chain. Transactions make it all-or-nothing.

**Controller:**
- Read `userId` from header (`req.header("x-user-id")`) for now.
- Validate body with Zod.
- Call service, return 201.

**Route:** `POST /requests`.

Test: create a request as the EMPLOYEE. Check DB — 1 Request row, 2 Approval rows with stepOrder 1 and 2, both PENDING.

### Slice 4 — Auth middleware (tiny stub)

**File: `src/middleware/auth.ts`**

The assignment says real auth is a bonus. For the core flow you just need to know *who* is acting:

1. Read `x-user-id` from headers.
2. If missing or the user doesn't exist → 401.
3. Attach the user to `req.user` (or `req.userId`).
4. Call `next()`.

Apply it to `/requests` routes. Don't overthink it — document in the README that real JWT auth is future work.

TypeScript tip: extend the Express `Request` type so `req.user` type-checks. Look up "express declaration merging" if it's new.

### Slice 5 — Get request by ID

**Service:**
```ts
return prisma.request.findUnique({
  where: { id },
  include: {
    user: true,
    approvals: {
      orderBy: { stepOrder: "asc" },
      include: { approver: true },
    },
  },
});
```

**Why `orderBy`:** reviewers and the frontend expect steps in order. Never rely on insertion order.

Return 404 if null.

**Route:** `GET /requests/:id`.

Test: hit `/requests/:id` for the request from Slice 3. You should see nested approvals in step order.

### Slice 6 — Approve / Reject (core of the project)

Same pattern for both. Build **approve** first.

**Service — `approveRequest(requestId, actingUserId, comment?)`:**

Wrap everything in `prisma.$transaction(async (tx) => { ... })`:

1. **Load the current step:**
   ```ts
   const currentStep = await tx.approval.findFirst({
     where: { requestId, status: "PENDING" },
     orderBy: { stepOrder: "asc" },
   });
   ```
2. **Validate:**
   - If `currentStep` is null → throw "request is already closed" (400).
   - If `currentStep.approverId !== actingUserId` → throw "not your turn" (403).
3. **Mark step approved:**
   ```ts
   await tx.approval.update({
     where: { id: currentStep.id },
     data: { status: "APPROVED", actedAt: new Date(), comment },
   });
   ```
4. **Was it the last step?**
   ```ts
   const remaining = await tx.approval.count({
     where: { requestId, status: "PENDING" },
   });
   if (remaining === 0) {
     await tx.request.update({
       where: { id: requestId },
       data: { status: "APPROVED" },
     });
   }
   ```
5. Return the updated request with its approvals.

**Service — `rejectRequest(requestId, actingUserId, comment?)`:**

Same start (load current step, verify it's the acting user's turn). Then:

1. Mark the current step REJECTED.
2. **Immediately** mark the request REJECTED — don't check remaining.
3. Leave later steps PENDING. They're stale but harmless; the request is closed.

**Controllers:** `POST /requests/:id/approve`, `POST /requests/:id/reject`. Both read `req.user.id` and optional `comment` from body.

**Error handling:** define custom error classes (e.g., `ForbiddenError`, `NotFoundError`, `BadRequestError`). Throw from services. An error middleware at the bottom of `server.ts` maps them to HTTP codes.

---

## 6. Why the transaction matters

Without `$transaction`, two calls can race. Scenario:

- Step 1 (Manager) is PENDING.
- Manager double-clicks Approve.
- Request A reads currentStep = step 1.
- Request B reads currentStep = step 1.
- Both call update. Two calls succeed; only one should.

`$transaction` with Prisma's default isolation (Read Committed) doesn't kill every race but prevents partial writes. For this assignment it's enough. Mention this tradeoff in the README's "design decisions" — reviewers like to see you've thought about concurrency.

---

## 7. Zod validation pattern

In each controller:

```ts
try {
  const body = userSchema.parse(req.body);
  // ... service call
} catch (e) {
  if (e instanceof ZodError) return res.status(400).json({ errors: e.errors });
  throw e;
}
```

Or centralize it: let controllers throw, and the error middleware catches `ZodError` and formats a 400. Pick one approach, be consistent.

Use Zod enums that match Prisma enums exactly:
```ts
z.enum(["MANAGER", "HR", "EMPLOYEE"])
```

---

## 8. Manual test script (curl)

```bash
# 1. Create users
curl -X POST localhost:3000/users -H "Content-Type: application/json" \
  -d '{"name":"Alice Manager","email":"alice@x.com","designation":"MANAGER"}'
curl -X POST localhost:3000/users -H "Content-Type: application/json" \
  -d '{"name":"Bob HR","email":"bob@x.com","designation":"HR"}'
curl -X POST localhost:3000/users -H "Content-Type: application/json" \
  -d '{"name":"Carol Emp","email":"carol@x.com","designation":"EMPLOYEE"}'
# save returned ids as $MGR, $HR, $EMP

# 2. Carol creates a request
curl -X POST localhost:3000/requests -H "Content-Type: application/json" \
  -H "x-user-id: $EMP" \
  -d '{"title":"New laptop","amount":1500}'
# save returned id as $REQ

# 3. View it — 2 PENDING approvals
curl localhost:3000/requests/$REQ

# 4. HR tries to approve out of turn — expect 403
curl -X POST localhost:3000/requests/$REQ/approve -H "x-user-id: $HR"

# 5. Manager approves — step 1 APPROVED, request still PENDING
curl -X POST localhost:3000/requests/$REQ/approve \
  -H "x-user-id: $MGR" -H "Content-Type: application/json" \
  -d '{"comment":"looks good"}'

# 6. HR approves — step 2 APPROVED, request now APPROVED
curl -X POST localhost:3000/requests/$REQ/approve -H "x-user-id: $HR"

# 7. Confirm
curl localhost:3000/requests/$REQ
```

Then run it again but reject at step 1 — request should flip to REJECTED, step 2 stays PENDING.

---

## 9. Edge cases to handle

| Case | Expected behavior |
|---|---|
| Approve an already-APPROVED request | 400 "request is closed" |
| Approve a REJECTED request | 400 "request is closed" |
| User B tries to approve when user A is the current approver | 403 "not your turn" |
| Creator approves their own request | Bonus: explicitly forbid; v1: rely on the fact they aren't in the chain |
| Amount ≤ 0 | Zod 400 |
| No MANAGER/HR user exists when creating a request | 500 or 400 "approval chain cannot be built" — document this |
| Missing `x-user-id` header | 401 |

---

## 10. README (required deliverable)

The assignment requires setup, API docs, and design decisions. Include:

- **Setup:** clone, `npm install`, copy `.env.example` → `.env`, start Postgres (docker compose if you added it), `npx prisma migrate dev`, `npm run dev`.
- **Env vars:** `DATABASE_URL`, `PORT`.
- **API table:** method, path, body shape, response shape, required headers.
- **Design decisions:**
  - Why a separate `Approval` table (audit, variable chain length, easy "my pending" queries).
  - Why `$transaction` (atomic chain creation, partial-write protection on approve/reject).
  - How the chain is generated (role-based for v1; amount-based rule optional).
  - Why `x-user-id` header for auth (stub for assignment scope; real JWT = future).
- **Future work / known gaps:** real auth, pagination, automated tests, idempotency keys, comment-required-on-reject.

An honest "known gaps" section is worth more than pretending everything is done.

---

## 11. Bonus items — ranked by ROI

Only after core works:

1. **Dockerize.** You have a `Dockerfile`. Add `docker-compose.yml` with a Postgres service. Big signal, minimal effort.
2. **One integration test.** Create request → approve twice → assert status APPROVED. Vitest or Jest + a test DB. One test > zero tests.
3. **Pagination** on `GET /users` and `GET /requests` (if you add list endpoints).
4. **Real JWT auth.** Swap the stub middleware. Add `/auth/login` that issues a token.

Don't attempt all four. Thoughtful core > rushed bonus.

---

## 12. Git practices (they're watching)

- Commit per slice. Messages like `feat: user creation endpoint`, `feat: generate approval chain on request create`, `fix: validate current approver before acting`.
- `.gitignore`: `node_modules`, `.env`, `src/generated/`, `.DS_Store`.
- Final commit with README + any polish.
- Push to GitHub. Submit the URL.

---

## 13. One-sentence summary

Build `User`, `Request`, `Approval` tables where `Approval` rows are ordered by `stepOrder`; on create, insert the whole chain in a transaction; on approve/reject, load the first PENDING approval, verify it belongs to the acting user, update it, and if it was the last step flip the request to APPROVED (reject flips immediately). That's the whole assignment.
