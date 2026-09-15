# ADR-006: B2C-first

**Status:** Accepted  
**Date:** 2026-09-15

## Context

Bilklar startar som privat övningskörning mellan elev och handledare (ofta förälder). Trafikskolor och externa system är framtida möjligheter, inte v1-krav.

## Decision

- B2C-first: elev + handledare utan trafikskola
- Ingen extern integration krävs för launch
- `driving_instructor` som collaborator role finns i modellen för framtiden men är ingen v1-feature
- `observation_source = driving_school` och `focus_source = driving_school` finns för framtida integration men används inte i v1

## Consequences

- Onboarding är QR/länk, inte skoladmin
- Ingen TABS/STR/SteerClear-integration i v1
- Datamodellen är redo för framtida källor utan att v1 bygger dem

## Relaterade dokument

- [Vision](../product/vision.md)
- [MVP v1](../product/mvp-v1.md)
