# ADR-002: Actor/auth separation

**Status:** Accepted  
**Date:** 2026-09-15

## Context

Handledare ska kunna delta via QR/länk innan full autentisering. Senare ska samma person kunna claima identiteten via Apple, Google, passkey eller email magic link — utan att byta `user_id`.

## Decision

- `users` = actor/person (stable identity)
- `auth_identities` = authentication methods linked to a user
- Guest actor får `account_state = guest` och kan senare få auth identities utan merge
- Ingen normal guest→registered-process ska kräva merge av `users`

## Consequences

- Alla FK (`observer_user_id`, `supervisor_user_id`, etc.) pekar på `users.id` — stabilt genom hela livscykeln
- Auth-provider integration är separat concern i framtida PR
- Guest session kan skapas vid invitation accept utan login-formulär

## Relaterade dokument

- [Onboarding & handoff](../product/onboarding-handoff.md)
- [Data model](../domain/data-model.md)
