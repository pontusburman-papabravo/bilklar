# Onboarding & handoff

Design för hur en elev bjuder in handledare utan administration och utan att byta `user_id`.

## Flöde

```text
Elev skapar driving_journey
    ↓
Elev genererar invitation (QR eller länk)
    ↓
Handledare scannar / öppnar länk
    ↓
Guest actor skapas (stable user_id) ELLER befintlig user loggar in
    ↓
Handledare accepterar invitation
    ↓
Handledare blir journey_collaborator (role: supervisor)
    ↓
Handledare deltar i körpass utan att administrera resan
```

## Guest actor

En handledare som inte har autentiserat sig än får:

1. En **stable `user_id`** vid första besök (via invitation token)
2. Möjlighet att **delta** i körpass och registrera observations
3. Möjlighet att **claima** identiteten senare (Apple, Google, passkey, email magic link)

**Ingen normal guest→registered-process ska kräva merge av `users`.** Samma `user_id` behålls när auth läggs till via `auth_identities`.

## Invitation-säkerhet

| Krav | Implementation |
| --- | --- |
| Token lagras endast hashad | `journey_invitations.token_hash` |
| Expiry | `expires_at` + status `expired` |
| Status | `pending` / `accepted` / `expired` / `revoked` |
| Accepted state | DB CHECK: `status = accepted` kräver `accepted_at` och `accepted_by_user_id` |
| Pending state | DB CHECK: `status = pending` kräver att accept-fält är NULL |
| One-time acceptance | Atomic UPDATE i service layer (se nedan) |
| Replay protection | Unik `token_hash`; exakt en caller vinner race |

### Atomic accept (service layer)

Race condition mellan parallella accept-requests löses med en enda conditional UPDATE — inte med mer modellering:

```sql
UPDATE journey_invitations
SET status = 'accepted',
    accepted_at = now(),
    accepted_by_user_id = $user_id,
    updated_at = now()
WHERE id = $invitation_id
  AND status = 'pending'
  AND expires_at > now()
RETURNING *;
```

Exakt en caller får raden. `RETURNING` tom → invitation redan accepterad, expired eller revoked.

## Constraints (ej i UI ännu)

- Eleven får **inte** bjudas in som sin egen handledare
- Samma user får **inte** förekomma två gånger i samma journey
- Studenten är **inte** collaborator — `student_user_id` på journey är canonical

## Relaterade dokument

- [Data model](../domain/data-model.md) — `journey_invitations`, `journey_collaborators`
- [ADR-002: Actor/auth separation](../decisions/ADR-002-actor-auth-separation.md)
- [ADR-001: Student-owned journey](../decisions/ADR-001-student-owned-journey.md)
