---
name: Database bootstrap
description: Initializing the development PostgreSQL schema for imported Drizzle workspaces.
---

An imported project can contain a complete Drizzle schema while the provisioned development database has no tables yet. Run the project's documented development schema push before testing flows that persist sessions or user data.

**Why:** OAuth can succeed with the external provider and still fail at the first database insert, which can make later retries appear to have invalid or expired OAuth state.

**How to apply:** When an imported app reports a missing relation in the API log, inspect the existing Drizzle schema and run its dev-only push command; do not alter production schema from the agent.