import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VK_ID_AUTH_URL = "https://id.vk.ru/authorize";
const VK_ID_TOKEN_URL = "https://id.vk.ru/oauth2/auth";
const VK_API_URL = process.env.VK_API_URL ?? "https://api.vk.ru/method";
const VK_API_VERSION = process.env.VK_API_VERSION ?? "5.199";

type VkTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: number;
  state?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type VkApiResponse<T> = {
  response?: T;
  error?: { error_code?: number; error_msg?: string };
};

export type VkUser = {
  id: number;
  name: string;
  avatarUrl: string | null;
};

export type VkCommunity = {
  id: number;
  name: string;
  avatarUrl: string | null;
};

export function getVkAppId(): string {
  const appId = process.env.VK_APP_ID;
  if (!appId) {
    throw new Error("VK_APP_ID is not configured");
  }
  return appId;
}

function getVkAppSecret(): string {
  const appSecret = process.env.VK_APP_SECRET;
  if (!appSecret) {
    throw new Error("VK_APP_SECRET is not configured");
  }
  return appSecret;
}

export function getVkRedirectUri(req: {
  get(name: string): string | undefined;
  protocol: string;
}): string {
  const configured = process.env.VK_REDIRECT_URI;
  if (configured) {
    return configured;
  }

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");
  if (!host) {
    throw new Error("Cannot determine VK OAuth redirect host");
  }

  return `${protocol}://${host}/api/auth/vk/callback`;
}

export function getVkCommunityToken(): string | null {
  return process.env.VK_COMMUNITY_TOKEN ?? null;
}

export function getVkAuthorizationUrl(params: {
  state: string;
  redirectUri: string;
  codeChallenge: string;
}): string {
  const url = new URL(VK_ID_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: getVkAppId(),
    redirect_uri: params.redirectUri,
    response_type: "code",
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
    scope: process.env.VK_OAUTH_SCOPE ?? "vkid.personal_info",
  }).toString();
  return url.toString();
}

export function randomId(): string {
  return randomBytes(32).toString("base64url");
}

export function createCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((value) => value.toString("base64url")).join(".");
}

export function decryptToken(payload: string): string {
  const [ivEncoded, authTagEncoded, encryptedEncoded] = payload.split(".");
  if (!ivEncoded || !authTagEncoded || !encryptedEncoded) {
    throw new Error("Invalid encrypted VK token");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`VK request failed with HTTP ${response.status}`);
  }
  return body;
}

export async function exchangeCode(params: {
  code: string;
  codeVerifier: string;
  deviceId: string;
  state: string;
  redirectUri: string;
}): Promise<Required<Pick<VkTokenResponse, "access_token">> & VkTokenResponse> {
  const response = await fetch(VK_ID_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getVkAppId(),
      service_token: getVkAppSecret(),
      redirect_uri: params.redirectUri,
      code: params.code,
      code_verifier: params.codeVerifier,
      device_id: params.deviceId,
      state: params.state,
    }),
  });
  const data = await parseJsonResponse<VkTokenResponse>(response);
  if (!data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "VK did not return an access token");
  }
  if (data.state && data.state !== params.state) {
    throw new Error("VK authorization state returned by VK ID does not match");
  }
  return data as Required<Pick<VkTokenResponse, "access_token">> & VkTokenResponse;
}

export async function callVkApi<T>(
  method: string,
  accessToken: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const query = new URLSearchParams({
    access_token: accessToken,
    v: VK_API_VERSION,
  });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  const response = await fetch(`${VK_API_URL}/${method}?${query.toString()}`);
  const data = await parseJsonResponse<VkApiResponse<T>>(response);
  if (data.error) {
    if (data.error.error_code === 1051) {
      throw new Error(
        "VK отклонил публикацию (1051): VK ID-токен не поддерживает wall.post. Для публикации используйте токен сообщества.",
      );
    }
    throw new Error(
      `VK ${method}: ${data.error.error_msg ?? "API request rejected"} (${data.error.error_code ?? "unknown"})`,
    );
  }
  if (data.response === undefined) {
    throw new Error(`VK ${method}: empty response`);
  }
  return data.response;
}

export async function getVkUser(accessToken: string, fallbackId?: number): Promise<VkUser> {
  const users = await callVkApi<Array<{
    id: number;
    first_name: string;
    last_name: string;
    photo_200?: string;
  }>>("users.get", accessToken, { user_ids: fallbackId });
  const user = users[0];
  if (!user) {
    throw new Error("VK did not return the authorized user");
  }
  return {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`.trim(),
    avatarUrl: user.photo_200 ?? null,
  };
}

export async function getVkCommunities(accessToken: string): Promise<VkCommunity[]> {
  const result = await callVkApi<{
    items: Array<{
      id: number;
      name: string;
      photo_200?: string;
    }>;
  }>("groups.get", accessToken, {
    extended: 1,
    filter: "admin,editor,moder",
    fields: "photo_200",
  });
  return result.items.map((community) => ({
    id: community.id,
    name: community.name,
    avatarUrl: community.photo_200 ?? null,
  }));
}

export function getSessionCookieOptions(req: { protocol: string }) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: req.protocol === "https",
    path: "/",
  };
}