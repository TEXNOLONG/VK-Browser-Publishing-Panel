---
name: VK Standalone OAuth
description: OAuth mode used by this app and the parameters that must stay out of its legacy token exchange.
---

The app uses VK's Standalone OAuth flow: authorize at `https://oauth.vk.com/authorize`, exchange the callback code at `https://oauth.vk.com/access_token`, and pass the resulting token as `access_token` to the classic VK API.

**Why:** VK ID tokens and legacy Standalone tokens are different token types. VK ID `device_id` and PKCE parameters belong to the `id.vk.com` flow and can cause Standalone applications to receive tokens rejected by legacy methods such as `groups.get`.

**How to apply:** Keep `device_id`, `code_verifier`, and `code_challenge` out of this flow. Keep the configured redirect URI identical in both the authorization URL and token exchange.