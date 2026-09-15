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
| One-time acceptance | `accepted_at` sätts en gång; status → `accepted` |
| Replay protection | Unik token_hash; accepterad invitation kan inte återanvändas |

## Constraints (ej i UI ännu)

- Eleven får **inte** bjudas in som sin egen handledare
- Samma user får **inte** förekomma två gånger i samma journey
- Studenten är **inte** collaborator — `student_user_id` på journey är canonical

## Relaterade dokument

- [Data model](../domain/data-model.md) — `journey_invitations`, `journey_collaborators`
- [ADR-002: Actor/auth separation](../decisions/ADR-002-actor-auth-separation.md)
- [ADR-001: Student-owned journey](../decisions/ADR-001-student-owned-journey.md)
