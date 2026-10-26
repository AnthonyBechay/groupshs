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

### Public pages: `force-dynamic`, no data cache

Every public page exports `export const dynamic = "force-dynamic"`. This is
deliberate: the database is unreachable during `docker build`, so build-time
prerendering would fail the build.

**There is no data cache, on purpose.** Queries in `src/lib/query-cache.ts`
read the database fresh on every request. They used to be wrapped in
`unstable_cache`, but no admin route ever invalidated those entries, so every
edit — a stats override, a gallery photo, a partner — stayed invisible on the
public site for 10–60 minutes. Traffic is low enough that fresh reads cost
nothing. (The `getCached*` names survive only to avoid churning call sites.)

**Do not reintroduce caching casually.** If it is ever needed, it requires
`tags` on every cached query **and** an invalidation call in every admin
mutation that touches that data. Missing a single route brings the
"I saved it but nothing changed" bug straight back.

In Next 16, `revalidateTag(tag, profile)` requires a profile. Use
`{ expire: 0 }` for immediate expiry — the `"max"` profile is
stale-while-revalidate and still serves the old data on the first request.
`updateTag()` only works inside Server Actions, not route handlers.

**Gotcha, if caching returns:** anything serialized through a cache comes back
with `Date` fields as ISO **strings**. Wrap before calling date methods:

```ts
new Date(value).toISOString()   // safe
value.toISOString()             // throws on a cache hit
```

### Authorization

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

### Unit types that are not branches

Two `unitType` values are not real units and hold no members:

- `ALL` — the audience of a group-wide activity ("All Units"). Selectable for
  activities; never a roster.
- `ARCHIVE` — one hidden system unit that holds anciens whose original unit is
  unknown (`unitId` is NOT NULL, so they need somewhere to point).

Every query that lists units for a person or the public spreads
`VISIBLE_UNITS_WHERE`; every write that puts a member in a unit checks
`unitHoldsMembers()`. Both live in `scout-config.ts`. The archive unit once
leaked onto the public activities page because one list query did not filter.

### Circulars (`src/lib/circular/`)

Letters to parents, generated from an activity as PDF or Word.

```
template  →  CircularContent (blocks + {{tokens}}, stored as JSON on `circular`)
          →  resolveCircular()   tokens filled, markup parsed
          →  render-pdf.ts / render-docx.ts
```

- **Tokens stay live.** Stored text keeps `{{dates}}`, `{{fee}}`…; they are
  filled from the activity, the unit and Settings at render time, so fixing the
  activity fixes the letter. `content.values` overrides a token for one
  circular. A token with no value prints as `[name]` and is reported — never
  silently dropped. Token list: `tokens.ts`.
- **Templates are starting points** (`templates.ts`): a function returning
  blocks. Editing a template never changes an existing circular.
- **Reference numbers** (`06/24-25/MeuteHathi`) are shared by the whole group
  per scout year: `@@unique([scoutYear, seq])`, allocated with a retry on
  collision. The scout year follows the letter date and
  `fiscalYearStartMonth`.
- **Both renderers read the same resolved document.** Change what a circular
  says in `resolve.ts`; change how it looks in the renderers.
- The PDF does its own line breaking (jsPDF has no rich text). Measure widths
  with kerning OFF — jsPDF measures kerned but writes unkerned, which glued
  words together. Built-in fonts are Latin-only: Arabic needs the Word export.
- Logos are fetched and converted to PNG on the server (`images.ts`): uploads
  are WebP, which neither jsPDF nor Word embeds. Only our own R2 host is
  fetched.
- `jspdf` and `docx` are in `serverExternalPackages`; do not remove them.
- The activity form's **dropoff = start, pickup = end** (the family's point of
  view). The circular calls them `startTime/startPlace`, `endTime/endPlace`.

### Activities have sessions

An `Activity` is defined once; each occurrence is an `ActivitySession`, which
holds what differs per day: `programme`, `notes`, attendance, cancellation.
A one-off has exactly one session; a weekly reunion (`recurrence = "WEEKLY"`,
`recurrenceUntil`) has one per week. **Attendance always belongs to a session**
(`@@unique([sessionId, memberId])`).

- Schedule maths is pure in `activity-schedule.ts` (days at UTC midnight, capped
  at `MAX_SESSIONS`); `syncActivitySessions()` applies it after any schedule
  change. It never deletes a session that has attendance or a programme — it
  cancels it instead — and a one-off whose date moves keeps its session.
- Access (`activity-sessions.ts`): a restricted user **views** their units'
  activities plus group-wide (`ALL`) ones, **edits** only their units', and
  takes attendance only for members of units they can access. The roster is the
  single check for attendance writes.
- Weekly reunions never reach the public site: every public activity query
  spreads `PUBLIC_ACTIVITY_WHERE`.

### Users ↔ members, "My unit"

`User.memberId` (optional, unique) links an account to the person. It is
**identity, not access**: `getMyUnit()` reads the unit they lead (served unit,
else home unit; none for the conseil) for the "My unit" page, but permissions
and `allowedUnitIds` still decide what they may touch.

### Family update links

`MemberUpdateRequest`: a token link a leader sends to a family to fill in the
file (`FAMILY_FIELD_GROUPS` in `member-update.ts` is the only set of fields a
family can propose). Opening it asks for the child's date of birth when one is
on file; it is rate-limited per IP and per link. A submission stores only the
diff and changes nothing until a leader applies it field by field. One open
link per member — creating another revokes the previous one. Tokens are stored
in clear on purpose so a link can be copied again; a leaked one can only
propose changes.

### Navigation state and unsaved changes

- Tabs, filters and open panels that a user would expect Back to restore live
  in the URL through `useUrlState` (`src/hooks/`), not in `useState`.
- `useUnsavedChanges` / `<UnsavedFormGuard />` wrap the pure `LeaveGuard`
  (`src/lib/leave-guard.ts`). After a save, navigate with the `leaveTo()` the
  hook returns, not `router.push`, or a stale history entry is left behind.
- Navigation must be real `<Link>`s: the guard watches link clicks, and a
  `<button onClick={router.push}>` slips past it.

### Images

All uploads go through `compressImage()` in `src/lib/image.ts`. Two routes call
it: `/api/upload` (general) and `/api/admin/gallery` (gallery).

The rule that matters: **branch on `stats().isOpaque`, not
`metadata().hasAlpha`.** Phones and screenshots emit fully-opaque PNGs that
still carry an alpha channel; treating those as transparent sends them down the
lossless PNG path and leaves multi-megabyte files (a 1.5 MB photo shrank only to
1 MB). Opaque → mozjpeg. Genuinely transparent → WebP, which keeps exact alpha.

Never use `png({ palette: true })`. Palette quantization turns anti-aliased
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

Migrations can be replayed against a real Postgres without Docker using PGlite
(Postgres compiled to WASM): apply every migration in order to an empty
database, then seed production-shaped rows and assert on the result. Worth the
ten minutes for any migration that rewrites data, since a failing one takes the
site down.

Generated documents (circular PDFs) are checked by rendering one from a script
and looking at it — layout bugs do not show up in a typecheck.
