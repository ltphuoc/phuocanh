import type {
  ChecklistCard,
  ListsPageData,
  MemoryCard,
  MemoryDetailData,
  WishItemCard,
} from "@/lib/server/phase-one-data";
import type {
  AlbumDetailData,
  AlbumsPageData,
  CountdownsPageData,
  FutureNotesPageData,
  MapPageData,
  TripDetailData,
  TripsPageData,
} from "@/lib/server/phase-two-data";
import type {
  DailyQuestionPageData,
  GamesHubData,
  GameplayStatsPageData,
} from "@/lib/server/phase-three-data";

export interface AppDataContext {
  readonly coupleId: string;
  readonly coupleStartedAt: string;
  readonly timeZone: string;
}

export interface HomeMemoryCard extends MemoryCard {
  readonly imageUrl: string | null;
}

export interface HomeAppData {
  readonly checklists: ChecklistCard[];
  readonly context: AppDataContext;
  readonly memories: HomeMemoryCard[];
  readonly relationshipDays: number;
  readonly wishItems: WishItemCard[];
}

export interface ListsAppData extends ListsPageData {
  readonly context: AppDataContext;
}

export interface OnThisDayAppData {
  readonly context: AppDataContext;
  readonly memories: MemoryCard[];
}

export interface MemoryDetailAppData {
  readonly context: AppDataContext;
  readonly media: readonly {
    readonly id: string;
    readonly mediaType: "image" | "video";
    readonly mimeType: string;
    readonly signedUrl: string | null;
    readonly storagePath: string;
  }[];
  readonly memory: MemoryDetailData;
}

export interface CountdownsAppData extends CountdownsPageData {
  readonly context: AppDataContext;
}

export interface FutureNotesAppData extends FutureNotesPageData {
  readonly context: AppDataContext;
}

export interface TripsAppData extends TripsPageData {
  readonly context: AppDataContext;
}

export interface TripDetailAppData {
  readonly context: AppDataContext;
  readonly trip: TripDetailData;
}

export interface MapAppData extends MapPageData {
  readonly context: AppDataContext;
}

export interface AlbumsAppData extends AlbumsPageData {
  readonly context: AppDataContext;
}

export interface AlbumDetailAppData {
  readonly album: AlbumDetailData;
  readonly context: AppDataContext;
}

export interface SettingsAppData {
  readonly context: AppDataContext;
  readonly currentTimeZone: string;
}

export interface GamesAppData extends GamesHubData {
  readonly context: AppDataContext;
}

export interface DailyQuestionAppData extends DailyQuestionPageData {
  readonly context: AppDataContext;
}

export interface StatsAppData extends GameplayStatsPageData {
  readonly context: AppDataContext;
}
