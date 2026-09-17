# CLAUDE.md

Guidance for working in this repository.

## What this is

The website and admin system for **Group SHS** (Groupe Sagesse High School — Ain Saadé),
a Lebanese scout group in *Les Scouts du Liban*. It serves two audiences:

- a **public site** — units, activities, news, gallery, milestones, a join form
- an **admin area** (`/admin`) — members, units, activities, attendance,
  recruitment, branch transitions, site content

Domain vocabulary (branches, roles, progressions, the maîtrise) is explained in
[SCOUTING.md](./SCOUTING.md). Read it before touching anything that models
members, roles or units — the naming is not arbitrary and several codes are
ambiguous.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript, strict |
| Database | PostgreSQL via Prisma 7 (client generated to `src/generated/prisma`) |
| Styling | Tailwind CSS v4 |
| Images | `sharp`, stored in Cloudflare R2 |
| Auth | JWT in an httpOnly cookie (`jose`), bcrypt passwords |
| Deploy | Docker → Coolify |

Monorepo: pnpm workspace. The app is `apps/web`; run every command from there.

## Commands

```bash
pnpm --filter web dev          # dev server
pnpm --filter web build        # prisma generate + next build
pnpm --filter web lint
npx tsc --noEmit               # typecheck (run from apps/web)
npx prisma generate            # after ANY schema change
```

There is no test runner configured. Pure logic (age rules, gender rules, role
tiers) is written so it can be exercised with a throwaway `npx tsx` script —
see "Verifying changes" below.

## Deployment

`docker-compose.yml` runs, on every container start:

```
npx prisma migrate deploy && node server.js
```

**Migrations apply themselves on deploy. Just push.** Nothing manual.

Two consequences that matter:

1. **Never edit a migration that has been pushed.** Prisma checksums them; an
   edited migration makes `migrate deploy` fail and the container never starts.
   Check with `git ls-files apps/web/prisma/migrations/` — if it is tracked and
   `origin/main` contains it, write a *new* migration instead.
2. **A failing migration takes the site down**, because the server only starts
   after it succeeds. Migrations must be idempotent (`IF NOT EXISTS`, guarded
   `UPDATE`s) and must respect `NOT NULL` columns.

### Required environment

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | **≥ 32 random characters.** In production the app refuses to start without it — see below |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Image storage |

`AUTH_SECRET` used to fall back to a hard-coded string. That string is in the
git history, so a missing variable meant admin sessions were signed with a
publicly known key. It now throws at startup in production instead. It is **not**
needed at build time (only dynamic routes touch it), so the Docker build is
unaffected.

### Bootstrapping the first admin

There is no seed script. The first super admin must be inserted directly into
the database. A user is a super admin if `role = 'super_admin'` **or** their
email equals `SUPER_ADMIN_EMAIL` in `src/lib/auth.ts`. Passwords are bcrypt
hashes. After that, admins are managed at `/admin/users`.

## Architecture notes

### Public pages: `force-dynamic` + `unstable_cache`

Every public page exports `export const dynamic = "force-dynamic"`. This is
deliberate: the database is unreachable during `docker build`, so build-time
prerendering would fail the build. Runtime speed comes from `unstable_cache`
wrappers in `src/lib/query-cache.ts` instead, busted by `revalidatePath()` in
admin mutations.

**Gotcha:** `unstable_cache` serialises through JSON, so `Date` objects come
back as ISO **strings** on a cache hit but as `Date` on the first call. Always
wrap before calling date methods:

```ts
new Date(value).toISOString()   // safe
value.toISOString()             // throws on a cache hit
```

### Authorisation

Three layers, all of which must agree:

1. `src/app/admin/layout.tsx` redirects non-admins out of `/admin`.
2. The nav shows a link based on the granular permission.
3. **The API route enforces it** with `hasPermission(session, "canManageX")`.

Layer 3 is the only real one. Do not gate an API on `session.role` — every
admin passes that check, so it ignores the granular permissions entirely and
lets, say, a unit leader delete the whole gallery.

Unit-scoped data additionally uses `canAccessUnit(session, unitId)`. A user with
a non-empty `allowedUnitIds` may only touch those units; an empty array means
all units.

### Members are the single source of truth for people

There is one record per person: `Member`.

- `status = "ACTIVE"` — on the roster
- `status = "LEFT"` — a former member, i.e. **an ancien**

Anciens are not a separate table. A former member keeps their file, attendance
and move history, and their alumni profile (`bio`, `professions`,
`scoutRolesHistory`) lives on the same row. The legacy `ancien` table still
exists as a backup of the one-time import; nothing reads it.

**Members are never hard deleted by a lifecycle action.** Leaving the group sets
`status = "LEFT"`. Deleting a person is a separate, explicit act on the member
page.

Anything listing people must filter `status: "ACTIVE"`, including `_count`
aggregates — otherwise departed members inflate rosters and counts.

### Transitions (`/admin/transitions`)

Three distinct flows, deliberately separate because they obey different rules:

| Flow | Rule |
|---|---|
| **Move Up** | Age-based, per fiscal year. Batch, revertible. |
| **Maîtrise** | Not age-based at all — leaders move by decision. |
| **Leaving** | Anyone, any role. Becomes an ancien. |

The age engine is `src/lib/age-transition.ts` — pure, timezone-safe, no DB.
Server glue is `src/lib/transition-service.ts`. See SCOUTING.md for the rules it
encodes.

Batch moves share a `batchId` on `MemberMove` and record the complete previous
state, so a whole promotion can be rolled back. The revert **skips** anyone
moved again since the batch rather than silently undoing that newer move, and
supports `{ dryRun: true }` to preview.

### Images

All uploads go through `compressImage()` in `src/lib/image.ts`. Two routes call
it: `/api/upload` (general) and `/api/admin/gallery` (gallery).

The rule that matters: **branch on `stats().isOpaque`, not
`metadata().hasAlpha`.** Phones and screenshots emit fully-opaque PNGs that
still carry an alpha channel; treating those as transparent sends them down the
lossless PNG path and leaves multi-megabyte files (a 1.5 MB photo shrank only to
1 MB). Opaque → mozjpeg. Genuinely transparent → WebP, which keeps exact alpha.

Never use `png({ palette: true })`. Palette quantisation turns anti-aliased
edges into a white box — that is what made the logo appear to have a white
background.

`.rotate()` runs before encoding so EXIF orientation is applied rather than
stripped, and animated GIFs are decoded with `{ animated: true }` so frames
survive.

## Conventions

- 4-space indent, double quotes, semicolons. Match the file you are in.
- Comments explain **why**, not what. Most existing comments record a decision
  or a trap; keep that standard.
- Scout terminology stays in French (Louveteaux, Sizaine, Maîtrise). UI text is
  English.
- Shared domain constants live in `src/lib/scout-config.ts`. Do not re-declare
  role or unit-type lists in a component — several already drifted and had to be
  reconciled.
- Forms that can lose work use `useUnsavedChanges` from `src/hooks/`.

## Verifying changes

There is no test runner, so verify deliberately:

```bash
npx tsc --noEmit        # always
npx eslint src          # always
npx next build          # before anything that touches rendering
```

For domain logic, write a throwaway script and run it with `npx tsx`. The age,
gender, leadership-tier and rate-limit rules were all validated this way; the
arithmetic around fiscal-year boundaries is genuinely easy to get wrong, and a
test catches an off-by-one that reading will not.

Do **not** start a dev server to check a database change — write a script, or
reason it through.
