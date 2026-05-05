# Architecture Lock

## 1. System Flow

```text
UI
-> events
-> actions
-> state
-> render
-> DOM
```

## 2. Rules

```text
NO NEW PATTERNS.

HTML structure is governed by layout-shell, layout-anchor, layout-2col,
layout-context, and layout-form.

CSS ownership is domain-bound. Layout belongs to layout files only.

State uses the standard ui/entities/session shape.

State mutations go through setState(partial).

Events bind user interaction and dispatch actions.

Actions orchestrate services, state updates, and render calls.

Render is the only app layer that builds or mutates DOM output.

Services talk to core/API and never touch DOM.

Core is only reached through feature services.
```

## 3. Forbidden Patterns

```text
No direct app -> core imports.

No Supabase usage outside src/core/api/.

No direct DB queries outside feature services.

All tenant-scoped DB operations pass through tenant guard.

All backend mutations pass through named service functions.

Feature services own validation and mapper layers.

src/core/api.js is an adapter only; backend primitives live in src/core/api/.

Database is the final source of truth:

RLS must be enabled for all tenant data tables.

Tenant tables must have tenant isolation policies.

Data shape must be enforced with NOT NULL, UNIQUE, CHECK, and FK constraints.

Write-sensitive tables must carry created_at, updated_at, and created_by.

Data-changing tables must write to the audit log.

No async work inside events or render.

No service/API calls inside events or render.

No DOM construction inside actions or services.

No random state outside *.state.js.

No direct state mutation outside setState(partial).

No new app file role outside the approved architecture roles.

No shared generic helper pattern without a domain owner.

No file over the enforced size limits.
```
