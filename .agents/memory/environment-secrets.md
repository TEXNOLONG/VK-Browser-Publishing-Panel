---
name: Environment secrets
description: Safe handling of local environment templates and Replit-managed secrets.
---

Replit does not allow the agent to create `.env` files in the workspace. Use a committed `.env.example` for variable names and placeholders, and use Replit Secrets for actual credentials.

**Why:** This prevents API keys, tokens, and other credentials from being written to the project filesystem by automation.

**How to apply:** When a user asks for a `.env`, add or update `.env.example`, document the copy/fill step, and never write actual secret values to the repository.