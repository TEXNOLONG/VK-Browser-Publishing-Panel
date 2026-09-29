import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vkSessionsTable } from "@workspace/db";
import {
  CreateVkPostBody,
  CreateVkPostResponse,
  ListVkDestinationsResponse,
} from "@workspace/api-zod";
import {
  callVkApi,
  decryptToken,
  getVkCommunityId,
  getVkCommunityToken,
  getVkCommunities,
} from "../lib/vk";
import { getSessionId } from "./vk-auth";

const router: IRouter = Router();

async function getActiveSession(req: Parameters<typeof getSessionId>[0]) {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    return null;
  }
  const [session] = await db
    .select()
    .from(vkSessionsTable)
    .where(eq(vkSessionsTable.id, sessionId))
    .limit(1);
  if (!session || session.expiresAt <= new Date()) {
    return null;
  }
  return {
    ...session,
    accessToken: decryptToken(session.encryptedAccessToken),
  };
}

router.get("/vk/destinations", async (req, res): Promise<void> => {
  const session = await getActiveSession(req);
  if (!session) {
    res.status(401).json({ error: "VK login is required." });
    return;
  }

  try {
    const communities = await getVkCommunities(session.accessToken);
    const destinations = [
      {
        ownerId: session.userId,
        name: `${session.profileName} (личная страница)`,
        type: "personal" as const,
        avatarUrl: session.profileAvatarUrl,
        canPost: false,
      },
      ...communities.map((community) => ({
        ownerId: -community.id,
        name: community.name,
        type: "community" as const,
        avatarUrl: community.avatarUrl,
        canPost:
          Boolean(getVkCommunityToken()) &&
          community.id === getVkCommunityId(),
      })),
    ];
    res.json(ListVkDestinationsResponse.parse(destinations));
  } catch (error) {
    req.log.error({ err: error }, "Unable to load VK destinations");
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unable to load VK destinations.",
    });
  }
});

router.post("/vk/posts", async (req, res): Promise<void> => {
  const session = await getActiveSession(req);
  if (!session) {
    res.status(401).json({ error: "VK login is required." });
    return;
  }

  const parsed = CreateVkPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const communities = await getVkCommunities(session.accessToken);
    if (parsed.data.ownerId === session.userId) {
      res.status(403).json({
        error: "Публикация на личной странице отключена: VK ID-токен не поддерживает wall.post.",
      });
      return;
    }
    const isAllowedDestination =
      communities.some((community) => parsed.data.ownerId === -community.id);
    if (!isAllowedDestination) {
      res.status(403).json({ error: "This VK destination is not available to your account." });
      return;
    }

    const communityToken = getVkCommunityToken();
    const communityId = getVkCommunityId();
    if (!communityToken || !communityId) {
      res.status(503).json({
        error: "Для публикации добавьте VK_COMMUNITY_TOKEN в Secrets и VK_COMMUNITY_ID в переменные окружения.",
      });
      return;
    }
    if (parsed.data.ownerId !== -communityId) {
      res.status(403).json({
        error: "Для выбранного сообщества не настроен токен публикации.",
      });
      return;
    }

    const result = await callVkApi<{ post_id: number }>("wall.post", communityToken, {
      owner_id: parsed.data.ownerId,
      message: parsed.data.message,
      ...(parsed.data.ownerId < 0 ? { from_group: 1 } : {}),
    });
    res.status(201).json(CreateVkPostResponse.parse({
      ownerId: parsed.data.ownerId,
      postId: result.post_id,
      publishedAt: new Date().toISOString(),
    }));
  } catch (error) {
    req.log.error({ err: error }, "Unable to publish VK post");
    res.status(400).json({
      error: error instanceof Error ? error.message : "VK rejected the post.",
    });
  }
});

export default router;