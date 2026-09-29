import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vkSessionsTable } from "@workspace/db";
import { GetAuthSessionResponse } from "@workspace/api-zod";
import {
  decryptToken,
  encryptToken,
  exchangeCode,
  getSessionCookieOptions,
  getVkAuthorizationUrl,
  getVkRedirectUri,
  getVkUser,
  randomId,
} from "../lib/vk";

const router: IRouter = Router();
const oauthStates = new Map<
  string,
  { redirectUri: string; expiresAt: number }
>();

function cleanupOauthStates(): void {
  const now = Date.now();
  for (const [state, value] of oauthStates) {
    if (value.expiresAt <= now) {
      oauthStates.delete(state);
    }
  }
}

function getSessionId(req: { cookies?: Record<string, string> }): string | undefined {
  return req.cookies?.vk_session;
}

router.get("/auth/vk/start", (req, res): void => {
  try {
    cleanupOauthStates();
    const state = randomId();
    const redirectUri = getVkRedirectUri(req);
    oauthStates.set(state, {
      redirectUri,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    res.cookie("vk_oauth_state", state, {
      ...getSessionCookieOptions(req),
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(getVkAuthorizationUrl({
      state,
      redirectUri,
    }));
  } catch (error) {
    req.log.error({ err: error }, "Unable to start VK authorization");
    res.status(503).json({ error: "VK authorization is not configured yet." });
  }
});

router.get("/auth/vk/callback", async (req, res): Promise<void> => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const stateData = oauthStates.get(state);
  oauthStates.delete(state);

  if (!stateData || stateData.expiresAt <= Date.now() || req.cookies?.vk_oauth_state !== state) {
    res.status(400).send("VK authorization state is invalid or expired. Start login again.");
    return;
  }
  if (!code) {
    const description = typeof req.query.error_description === "string"
      ? req.query.error_description
      : "VK authorization was cancelled.";
    res.status(400).send(description);
    return;
  }
  try {
    const tokenData = await exchangeCode({
      code,
      redirectUri: stateData.redirectUri,
    });
    const profile = await getVkUser(tokenData.access_token, tokenData.user_id);
    const sessionId = randomId();
    const expiresAt = new Date(
      Date.now() + (tokenData.expires_in ?? 3600) * 1000,
    );

    await db.insert(vkSessionsTable).values({
      id: sessionId,
      encryptedAccessToken: encryptToken(tokenData.access_token),
      userId: profile.id,
      profileName: profile.name,
      profileAvatarUrl: profile.avatarUrl,
      expiresAt,
    });

    res.clearCookie("vk_oauth_state", getSessionCookieOptions(req));
    res.cookie("vk_session", sessionId, {
      ...getSessionCookieOptions(req),
      maxAge: Math.max(expiresAt.getTime() - Date.now(), 60_000),
    });
    res.redirect("/");
  } catch (error) {
    req.log.error({ err: error }, "VK authorization callback failed");
    res.status(502).send("VK authorization failed. Check the app settings and try again.");
  }
});

router.get("/auth/session", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.json(GetAuthSessionResponse.parse({ authenticated: false, profile: null }));
    return;
  }

  const [session] = await db
    .select()
    .from(vkSessionsTable)
    .where(eq(vkSessionsTable.id, sessionId))
    .limit(1);

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await db.delete(vkSessionsTable).where(eq(vkSessionsTable.id, session.id));
    }
    res.clearCookie("vk_session", getSessionCookieOptions(req));
    res.json(GetAuthSessionResponse.parse({ authenticated: false, profile: null }));
    return;
  }

  res.json(GetAuthSessionResponse.parse({
    authenticated: true,
    profile: {
      id: session.userId,
      name: session.profileName,
      avatarUrl: session.profileAvatarUrl,
    },
  }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (sessionId) {
    await db.delete(vkSessionsTable).where(eq(vkSessionsTable.id, sessionId));
  }
  res.clearCookie("vk_session", getSessionCookieOptions(req));
  res.sendStatus(204);
});

export { getSessionId };
export { decryptToken };
export default router;