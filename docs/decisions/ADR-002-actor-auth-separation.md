# ADR-002: Actor/auth separation

**Status:** Accepted  
**Date:** 2026-09-15

## Context

Handledare ska kunna delta via QR/länk innan full autentisering. Senare ska samma person kunna claima identiteten via Apple eller Google — utan att byta `user_id`. Passkey och e-post magic link är inte v1-produktauth; se [ADR-008](ADR-008-app-oauth-accounts.md).

## Decision

- `users` = actor/person (stable identity)
- `auth_identities` = authentication methods linked to a user
- Guest actor får `account_state = guest` och kan senare få auth identities utan merge
- Normal claim av en tidigare oanvänd auth identity behåller samma `user_id`
- Claim av en identity som redan hör till en annan user är ett separat account-reconciliation-fall och ingår inte i första vertical slice

## Consequences

- Alla FK (`observer_user_id`, `supervisor_user_id`, etc.) pekar på `users.id` — stabilt genom hela livscykeln
- Auth-provider integration för produktkonton är Apple och Google i appen ([ADR-008](ADR-008-app-oauth-accounts.md))
- Guest session kan skapas vid invitation accept utan login-formulär
- Scenario "guest på ny telefon → gör körpass → loggar in med befintlig Apple-identitet som redan sitter på annan user" kräver reconciliation — byggs inte nu

## Relaterade dokument

- [Onboarding & handoff](../product/onboarding-handoff.md)
- [Data model](../domain/data-model.md)
- [ADR-008: App-only konton via Apple och Google](ADR-008-app-oauth-accounts.md)
