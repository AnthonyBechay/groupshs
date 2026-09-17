# The scouting domain

How Group SHS is actually structured, and how that maps onto the code. This is
the part you cannot infer from the schema — several things that look like
ordinary strings carry real meaning, and two role codes mean different things
depending on where they sit.

Group SHS belongs to **Les Scouts du Liban**. Terminology is French; the UI is
in English; stored values stay French.

---

## 1. Branches

Members are organised by age into **branches**, along two parallel tracks.

| | Boys | Girls | Ages |
|---|---|---|---|
| Youngest | **Louveteaux** | **Louvettes** | ~8–12 |
| Middle | **Eclaireurs** | **Eclaireuses** | ~12–17 |
| Oldest | **Routiers** | **Pionnières** | 17+ |

Plus **GROUP** — not an age branch, but where the group-level leadership sits.

A *unit* is one concrete group of a branch ("Louveteaux 1"). A branch can have
several units. `Unit.unitType` holds the branch; `Unit.name` is the local name.

Each branch has a traditional container name and a sub-group name:

| Branch | Container | Sub-group |
|---|---|---|
| Louveteaux / Louvettes | Meute | Sizaine |
| Eclaireurs / Eclaireuses | Troupe | Patrouille |
| Routiers / Pionnières | Clan | Equipe |

In code: `UNIT_CONTAINER_NAME`, `SUBGROUP_LABEL_BY_UNIT_TYPE`.

### Gender is inseparable from the branch

An Eclaireuse **is** a girl; an Eclaireur **is** a boy. This is not a label on
top of the branch, it is the same fact. So for a *youth* member, gender and
branch must agree, and a blank gender can simply be derived from the branch.

**The maîtrise is exempt.** A *Cheftaine* Meute is a woman who leads the boys'
Louveteaux. A leader's gender is their own and says nothing about the unit they
serve, so leaders may serve in any unit and their gender is never derived from
it.

`resolveMemberGender()` in `scout-config.ts` encodes exactly this.

---

## 2. Roles

### Youth roles

Ordinary members hold a rank within their sub-group.

| Branch | Roles |
|---|---|
| Louveteaux | `L` Louveteau · `SE` Second de Sizaine · `SI` Sizenier |
| Eclaireurs | `E` Eclaireur · `SP` Second de Patrouille · `CP` Chef de Patrouille |
| Routiers | `R` Routier · `CE` Chef d'Equipe |
| Louvettes | `LV` · `SES` Seconde de Sizaine · `SIS` Sizenière |
| Eclaireuses | `EC` · `SPS` · `CPS` Cheftaine de Patrouille |
| Pionnières | `PI` · `CES` Cheftaine d'Equipe |

### ⚠️ Two codes are ambiguous

`SE` and `CE` exist in **both** a youth list and the leadership list:

| Code | Inside a branch unit | Inside GROUP |
|---|---|---|
| `SE` | Second de Sizaine — **a child** | Secrétaire de Groupe — a leader |
| `CE` | Chef d'Equipe — **a youth** | Chef d'équipe — a leader |

Reading these as leadership everywhere is a real bug with real consequences: a
Second de Sizaine would be treated as maîtrise, and therefore **exempted from the
age rule and never promoted out of the Louveteaux**.

Always use `isLeadershipRoleIn(role, unitType)`, which resolves by context: a
code claimed by that unit's own branch is the youth role. `AMBIGUOUS_ROLES`
derives the clashing set from the config rather than hard-coding it, so adding
another clashing code cannot silently reintroduce the bug.

---

## 3. The maîtrise — and its two tiers

The **maîtrise** is the leadership team. It splits in two, and the distinction
is structural, not cosmetic.

### Unit maîtrise

`CT` Chef Troupe · `ACT` · `CM` Cheftaine Meute · `ACM` · `CC` Chef Clan ·
`ACC` · `CE`

They run a younger unit **but remain members of the Routiers / Pionnières**. A
Cheftaine Meute is a Pionnière who serves the Meute. Two different units are
therefore involved:

- `Member.unitId` — their **home** unit (senior branch)
- `Member.servesUnitId` — the unit they **run**

### The conseil

`CG` Chef de Groupe · `ACG` · `EA` Equipe Administrative · `TR` Trésorier ·
`SE` Secrétaire · `AU` Aumônier

The leaders of leaders. They sit at group level and are **not** Routiers /
Pionnières in parallel — for them the GROUP unit is their home unit.

In code: `COUNCIL_ROLES`, `UNIT_MAITRISE_ROLES`, `isCouncilRole()`.

### Concurrent roles, and why the rules are advisory

One person can hold **several roles at once** — a `CM` who is also `ACG`. That
is the exception rather than the norm, but it happens, and it is exactly the
case that breaks a naive "conseil are never Pionnières" rule.

So `Member.extraRoles[]` carries any additional roles, and
`leadershipWarnings()` returns **advice, not errors**. The UI surfaces them and
still lets you save. Holding a unit-maîtrise role suppresses the conseil warning,
because such a person legitimately remains in the senior branch.

Leaders are **never moved by the age rules**. They move by decision, through
the Maîtrise tab.

---

## 4. Progression

Badges earned within a branch. They reset on moving up, because they are
branch-specific — but the previous values are preserved on the move record, so
nothing is lost.

| Branch | Steps |
|---|---|
| Louveteaux / Louvettes | Pattes Tendres → Promesse → 1 Etoile → 2 Etoiles |
| Eclaireurs / Eclaireuses | Eclaireur(se) → Promesse → Seconde Classe → Première Classe |
| Routiers / Pionnières | Routier/Pionnière → **Première Veille** → **Départ** |

**Départ** is the end of the scouting path — the ceremony marking departure from
the youth branches. It is the natural moment someone becomes an ancien.

Stored as codes (`PremiereVeille`, `Depart`), rendered via `progressionLabel()`.
They were once stored as accented display strings in one place and codes in
another; the mismatch silently wiped progressions on edit. Keep them as codes.

---

## 5. Moving up, and the fiscal year

> A member moves up when they reach the branch's age **at any point during the
> fiscal year** — not on their birthday, and not at a fixed date.

The scouting year runs from September, so `fiscalYearStartMonth` defaults to 9.
With a threshold of 12: a Louveteau who turns 12 anywhere between 1 September
and 31 August is due to join the Eclaireurs — including one whose birthday is in
August, at the very end of the year.

This is why the engine computes *the age attained during the year*, not the age
today. Getting this wrong by one leaves a child in the wrong branch for a year.

Each branch has its **own** configurable threshold — the boys' and girls' tracks
are tuned independently, never shared:

- `ageLouveteauxToEclaireurs` (12) · `ageEclaireursToRoutiers` (17)
- `ageLouvettesToEclaireuses` (12) · `ageEclaireusesToPionnieres` (17)

All four are editable in Settings. The same rule places new recruits
(`suggestBranchForAge`), so nobody is ever put into a branch they are already
due to leave.

Routiers and Pionnières have no exit age: there is nothing above them. Members
finishing there leave the group.

---

## 6. Leaving — anciens

Anyone can leave, at any point: an Eclaireur who stops scouting, a CT stepping
down, a Routier completing their Départ.

**An ancien is a former member — not a separate kind of record.** They are a
`Member` with `status = "LEFT"`, keeping their file, attendance and move
history, with an alumni profile (bio, current professions, role history) on the
same row.

Their scout role history is reconstructed automatically from their move records,
so it never has to be re-typed.

---

## 7. Recruitment

A public application (`/join`) → reviewed in `/admin/recruitment` → and the
final step that actually matters: **enrolling them into a unit**, which creates
the member record. Marking someone "recruited" without enrolling them leaves
them on no roster at all.

The branch is suggested from age and gender using the same fiscal-year rule as
promotions.

---

## Glossary

| Term | Meaning |
|---|---|
| **Maîtrise** | The leadership team |
| **Conseil** | Group-level leaders — the leaders of leaders |
| **Meute / Troupe / Clan** | The unit of Louveteaux / Eclaireurs / Routiers |
| **Sizaine / Patrouille / Equipe** | Sub-group within a unit |
| **Sizenier / Chef de Patrouille** | Youth leading a sub-group |
| **Chef · Cheftaine** | Leader (m · f) |
| **Aumônier** | Chaplain |
| **Promesse** | The scout promise |
| **Première Veille** | Late-stage Routier/Pionnière progression |
| **Départ** | Ceremony ending the youth path |
| **Ancien** | Former member |
