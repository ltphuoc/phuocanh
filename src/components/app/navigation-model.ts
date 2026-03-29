import {
  Album,
  CalendarClock,
  Camera,
  Compass,
  Gamepad2,
  Heart,
  Home,
  ListTodo,
  MapPinned,
  MessageCircleHeart,
  MoreHorizontal,
  Settings2,
  Sparkles,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface AppNavigationItem {
  readonly descriptionKey?: NavigationDescriptionKey;
  readonly groupKey?: NavigationGroupKey;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly labelKey: NavigationLabelKey;
  readonly matchPrefixes: readonly string[];
  readonly mobileLabelKey?: NavigationLabelKey;
}

type NavigationLabelKey =
  | "nav.items.albums.label"
  | "nav.items.chat.label"
  | "nav.items.countdowns.label"
  | "nav.items.futureNotes.label"
  | "nav.items.games.label"
  | "nav.items.home.label"
  | "nav.items.lists.label"
  | "nav.items.map.label"
  | "nav.items.memory.label"
  | "nav.items.more.label"
  | "nav.items.newMemory.label"
  | "nav.items.onThisDay.label"
  | "nav.items.onThisDay.mobileLabel"
  | "nav.items.settings.label"
  | "nav.items.stats.label"
  | "nav.items.trips.label";

type NavigationDescriptionKey =
  | "nav.items.albums.description"
  | "nav.items.chat.description"
  | "nav.items.countdowns.description"
  | "nav.items.futureNotes.description"
  | "nav.items.games.description"
  | "nav.items.lists.description"
  | "nav.items.map.description"
  | "nav.items.memory.description"
  | "nav.items.newMemory.description"
  | "nav.items.settings.description"
  | "nav.items.stats.description"
  | "nav.items.trips.description";

type NavigationGroupKey =
  | "nav.groups.planning"
  | "nav.groups.play"
  | "nav.groups.space"
  | "nav.groups.together"
  | "nav.groups.travel";

export const appPrimaryNavigationItems: readonly AppNavigationItem[] = [
  {
    href: "/home",
    icon: Home,
    labelKey: "nav.items.home.label",
    matchPrefixes: ["/home"],
  },
  {
    href: "/on-this-day",
    icon: Heart,
    labelKey: "nav.items.onThisDay.label",
    mobileLabelKey: "nav.items.onThisDay.mobileLabel",
    matchPrefixes: ["/on-this-day"],
  },
  {
    descriptionKey: "nav.items.chat.description",
    href: "/chat",
    icon: MessageCircleHeart,
    labelKey: "nav.items.chat.label",
    matchPrefixes: ["/chat"],
  },
] as const;

export const appSecondaryNavigationItems: readonly AppNavigationItem[] = [
  {
    descriptionKey: "nav.items.lists.description",
    groupKey: "nav.groups.together",
    href: "/lists",
    icon: ListTodo,
    labelKey: "nav.items.lists.label",
    matchPrefixes: ["/lists"],
  },
  {
    descriptionKey: "nav.items.trips.description",
    groupKey: "nav.groups.travel",
    href: "/trips",
    icon: Compass,
    labelKey: "nav.items.trips.label",
    matchPrefixes: ["/trips"],
  },
  {
    descriptionKey: "nav.items.albums.description",
    groupKey: "nav.groups.travel",
    href: "/albums/featured",
    icon: Album,
    labelKey: "nav.items.albums.label",
    matchPrefixes: ["/albums"],
  },
  {
    descriptionKey: "nav.items.map.description",
    groupKey: "nav.groups.travel",
    href: "/map",
    icon: MapPinned,
    labelKey: "nav.items.map.label",
    matchPrefixes: ["/map"],
  },
  {
    descriptionKey: "nav.items.countdowns.description",
    groupKey: "nav.groups.planning",
    href: "/countdowns",
    icon: Timer,
    labelKey: "nav.items.countdowns.label",
    matchPrefixes: ["/countdowns"],
  },
  {
    descriptionKey: "nav.items.futureNotes.description",
    groupKey: "nav.groups.planning",
    href: "/future-notes",
    icon: CalendarClock,
    labelKey: "nav.items.futureNotes.label",
    matchPrefixes: ["/future-notes"],
  },
  {
    descriptionKey: "nav.items.games.description",
    groupKey: "nav.groups.play",
    href: "/games",
    icon: Gamepad2,
    labelKey: "nav.items.games.label",
    matchPrefixes: ["/games"],
  },
  {
    descriptionKey: "nav.items.stats.description",
    groupKey: "nav.groups.play",
    href: "/stats",
    icon: Trophy,
    labelKey: "nav.items.stats.label",
    matchPrefixes: ["/stats"],
  },
  {
    descriptionKey: "nav.items.settings.description",
    groupKey: "nav.groups.space",
    href: "/settings",
    icon: Settings2,
    labelKey: "nav.items.settings.label",
    matchPrefixes: ["/settings"],
  },
] as const;

const appSecondaryPrefixes: readonly string[] = appSecondaryNavigationItems.flatMap(
  (item) => item.matchPrefixes,
);

export const appMoreNavigationItem: AppNavigationItem = {
  href: "/settings",
  icon: MoreHorizontal,
  labelKey: "nav.items.more.label",
  matchPrefixes: appSecondaryPrefixes,
};

export const appMobileNavigationItems: readonly AppNavigationItem[] = [
  ...appPrimaryNavigationItems,
  appMoreNavigationItem,
] as const;

export const mobileContextQuickActions: readonly AppNavigationItem[] = [
  {
    descriptionKey: "nav.items.newMemory.description",
    href: "/memories/new",
    icon: Sparkles,
    labelKey: "nav.items.newMemory.label",
    matchPrefixes: ["/memories/new"],
  },
];

export const appMemoryActionItem: AppNavigationItem = {
  descriptionKey: "nav.items.memory.description",
  href: "/memories/new",
  icon: Camera,
  labelKey: "nav.items.memory.label",
  matchPrefixes: ["/memories", "/memories/new"],
  mobileLabelKey: "nav.items.memory.label",
};

export const isAppNavigationItemActive = (
  pathname: string,
  item: AppNavigationItem,
): boolean =>
  pathname === item.href || item.matchPrefixes.some((prefix) => pathname.startsWith(prefix));
