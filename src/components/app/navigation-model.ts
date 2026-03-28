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
  readonly description?: string;
  readonly group?: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly matchPrefixes: readonly string[];
  readonly mobileLabel?: string;
}

export const appPrimaryNavigationItems: readonly AppNavigationItem[] = [
  {
    href: "/home",
    icon: Home,
    label: "Home",
    matchPrefixes: ["/home"],
  },
  {
    href: "/on-this-day",
    icon: Heart,
    label: "On this day",
    mobileLabel: "Today",
    matchPrefixes: ["/on-this-day"],
  },
  {
    description: "The private thread between the two of you.",
    href: "/chat",
    icon: MessageCircleHeart,
    label: "Chat",
    matchPrefixes: ["/chat"],
  },
] as const;

export const appSecondaryNavigationItems: readonly AppNavigationItem[] = [
  {
    description: "Wishlist items and shared checklists.",
    group: "Together",
    href: "/lists",
    icon: ListTodo,
    label: "Lists",
    matchPrefixes: ["/lists"],
  },
  {
    description: "Journeys, staycations, and shared itineraries.",
    group: "Travel",
    href: "/trips",
    icon: Compass,
    label: "Trips",
    matchPrefixes: ["/trips"],
  },
  {
    description: "Albums linked to trips and memories.",
    group: "Travel",
    href: "/albums/featured",
    icon: Album,
    label: "Albums",
    matchPrefixes: ["/albums"],
  },
  {
    description: "Pins, routes, and place-based memories.",
    group: "Travel",
    href: "/map",
    icon: MapPinned,
    label: "Map",
    matchPrefixes: ["/map"],
  },
  {
    description: "Dates worth waiting for together.",
    group: "Planning",
    href: "/countdowns",
    icon: Timer,
    label: "Countdowns",
    matchPrefixes: ["/countdowns"],
  },
  {
    description: "Notes for future versions of yourselves.",
    group: "Planning",
    href: "/future-notes",
    icon: CalendarClock,
    label: "Future notes",
    matchPrefixes: ["/future-notes"],
  },
  {
    description: "Playful couple prompts and mini games.",
    group: "Play",
    href: "/games",
    icon: Gamepad2,
    label: "Games",
    matchPrefixes: ["/games"],
  },
  {
    description: "Soft metrics and little streaks.",
    group: "Play",
    href: "/stats",
    icon: Trophy,
    label: "Stats",
    matchPrefixes: ["/stats"],
  },
  {
    description: "Manage your space and preferences.",
    group: "Space",
    href: "/settings",
    icon: Settings2,
    label: "Settings",
    matchPrefixes: ["/settings"],
  },
] as const;

const appSecondaryPrefixes: readonly string[] = appSecondaryNavigationItems.flatMap(
  (item) => item.matchPrefixes,
);

export const appMoreNavigationItem: AppNavigationItem = {
  href: "/settings",
  icon: MoreHorizontal,
  label: "More",
  matchPrefixes: appSecondaryPrefixes,
};

export const appMobileNavigationItems: readonly AppNavigationItem[] = [
  ...appPrimaryNavigationItems,
  appMoreNavigationItem,
] as const;

export const mobileContextQuickActions: readonly AppNavigationItem[] = [
  {
    description: "Capture a moment quickly.",
    href: "/memories/new",
    icon: Sparkles,
    label: "New memory",
    matchPrefixes: ["/memories/new"],
  },
];

export const appMemoryActionItem: AppNavigationItem = {
  description: "Capture a new memory.",
  href: "/memories/new",
  icon: Camera,
  label: "Memory",
  matchPrefixes: ["/memories", "/memories/new"],
  mobileLabel: "Memory",
};

export const isAppNavigationItemActive = (
  pathname: string,
  item: AppNavigationItem,
): boolean =>
  pathname === item.href || item.matchPrefixes.some((prefix) => pathname.startsWith(prefix));
