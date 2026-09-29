---
name: VK ID OAuth
description: VK ID web OAuth flow requirements that are easy to miss when exchanging the authorization code.
---

VK ID's web authorization callback returns both `code` and `device_id`. The backend must pass both values, along with the original PKCE verifier and redirect URI, to the `oauth2/auth` token exchange endpoint.

**Why:** VK returns `device_id is invalid` when the callback's device ID is omitted, even when the authorization redirect and client ID are valid.

**How to apply:** Keep the authorization URL on `https://id.vk.com/authorize`; parse `device_id` from the callback query and include it in the token request.