import {
  getAlbumDetailAppData,
  getAlbumsAppData,
  getCountdownsAppData,
  getDailyQuestionAppData,
  getFutureNotesAppData,
  getGamesAppData,
  getGuessDateAppData,
  getHomeAppData,
  getListsAppData,
  getMapAppData,
  getMemoryDetailAppData,
  getOnThisDayAppData,
  getSettingsAppData,
  getStatsAppData,
  getTripDetailAppData,
  getTripsAppData,
} from "@/lib/server/app-data";
import { getAuthGateState } from "@/lib/server/couple-context";

interface AppDataRouteContext {
  readonly params: Promise<{
    readonly slug: string[];
  }>;
}

const noStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

const json = (body: unknown, status = 200): Response =>
  Response.json(body, {
    headers: noStoreHeaders,
    status,
  });

export const GET = async (
  _request: Request,
  { params }: AppDataRouteContext,
): Promise<Response> => {
  const state = await getAuthGateState();

  if (state.status === "unauthenticated") {
    return json({ error: "unauthenticated" }, 401);
  }

  if (state.status !== "ready") {
    return json({ error: "couple_context_not_ready" }, 403);
  }

  const { slug } = await params;

  try {
    switch (slug[0]) {
      case "albums": {
        if (slug.length === 1) {
          return json(await getAlbumsAppData(state.context));
        }

        if (slug.length === 2) {
          const album = await getAlbumDetailAppData(state.context, slug[1]);
          return album ? json(album) : json({ error: "not_found" }, 404);
        }

        break;
      }

      case "countdowns":
        if (slug.length === 1) {
          return json(await getCountdownsAppData(state.context));
        }
        break;

      case "future-notes":
        if (slug.length === 1) {
          return json(await getFutureNotesAppData(state.context));
        }
        break;

      case "games":
        if (slug.length === 1) {
          return json(await getGamesAppData(state.context));
        }

        if (slug.length === 2 && slug[1] === "daily-question") {
          return json(await getDailyQuestionAppData(state.context));
        }

        if (slug.length === 2 && slug[1] === "guess-date") {
          return json(await getGuessDateAppData(state.context));
        }

        break;

      case "home":
        if (slug.length === 1) {
          return json(await getHomeAppData(state.context));
        }
        break;

      case "lists":
        if (slug.length === 1) {
          return json(await getListsAppData(state.context));
        }
        break;

      case "map":
        if (slug.length === 1) {
          return json(await getMapAppData(state.context));
        }
        break;

      case "memories":
        if (slug.length === 2) {
          const memory = await getMemoryDetailAppData(state.context, slug[1]);
          return memory ? json(memory) : json({ error: "not_found" }, 404);
        }
        break;

      case "on-this-day":
        if (slug.length === 1) {
          return json(await getOnThisDayAppData(state.context));
        }
        break;

      case "settings":
        if (slug.length === 1) {
          return json(getSettingsAppData(state.context));
        }
        break;

      case "stats":
        if (slug.length === 1) {
          return json(await getStatsAppData(state.context));
        }
        break;

      case "trips": {
        if (slug.length === 1) {
          return json(await getTripsAppData(state.context));
        }

        if (slug.length === 2) {
          const trip = await getTripDetailAppData(state.context, slug[1]);
          return trip ? json(trip) : json({ error: "not_found" }, 404);
        }

        break;
      }

      default:
        break;
    }

    return json({ error: "not_found" }, 404);
  } catch (error: unknown) {
    console.error("Failed to load app data", error);
    return json({ error: "unexpected_error" }, 500);
  }
};
