export interface DrizzleBaselineEntity {
  readonly name: string;
  readonly sourceMigration: string;
  readonly status: "planned_mirror" | "sql_authoritative";
}

export const appTableBaseline: readonly DrizzleBaselineEntity[] = [
  {
    name: "public.couples",
    sourceMigration: "20260329223000_couple_timezone_foundation.sql",
    status: "planned_mirror",
  },
  {
    name: "public.couple_memberships",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "planned_mirror",
  },
  {
    name: "public.couple_invites",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "planned_mirror",
  },
  { name: "public.memories", sourceMigration: "20260327214000_phase1_mvp.sql", status: "planned_mirror" },
  {
    name: "public.memory_media",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "planned_mirror",
  },
  { name: "public.wish_items", sourceMigration: "20260327214000_phase1_mvp.sql", status: "planned_mirror" },
  { name: "public.checklists", sourceMigration: "20260327214000_phase1_mvp.sql", status: "planned_mirror" },
  {
    name: "public.checklist_items",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "planned_mirror",
  },
  {
    name: "public.activity_events",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "planned_mirror",
  },
  {
    name: "public.countdowns",
    sourceMigration: "20260329110000_phase2_slice1_countdowns_future_notes.sql",
    status: "planned_mirror",
  },
  {
    name: "public.future_notes",
    sourceMigration: "20260329110000_phase2_slice1_countdowns_future_notes.sql",
    status: "planned_mirror",
  },
  {
    name: "public.future_note_contents",
    sourceMigration: "20260329110000_phase2_slice1_countdowns_future_notes.sql",
    status: "planned_mirror",
  },
  {
    name: "public.trips",
    sourceMigration: "20260329153000_phase2_slice2_trips_foundation.sql",
    status: "planned_mirror",
  },
  {
    name: "public.albums",
    sourceMigration: "20260329170000_phase2_slice3_trip_albums_foundation.sql",
    status: "planned_mirror",
  },
  {
    name: "public.album_items",
    sourceMigration: "20260329170000_phase2_slice3_trip_albums_foundation.sql",
    status: "planned_mirror",
  },
  {
    name: "public.visited_places",
    sourceMigration: "20260329193000_phase2_slice4_visited_places_atlas_foundation.sql",
    status: "planned_mirror",
  },
] as const;

export const phaseOneTableBaseline = appTableBaseline;

export const sqlAuthoritativeObjects: readonly DrizzleBaselineEntity[] = [
  {
    name: "public.bootstrap_first_couple(date, text)",
    sourceMigration: "20260327233000_phase1_hardening.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.accept_couple_invite(text)",
    sourceMigration: "20260327233000_phase1_hardening.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.memories_on_this_day(uuid, text)",
    sourceMigration: "20260327233000_phase1_hardening.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.create_album_with_items(uuid, text, text, uuid[])",
    sourceMigration: "20260329170000_phase2_slice3_trip_albums_foundation.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.add_album_items(uuid, uuid[])",
    sourceMigration: "20260329170000_phase2_slice3_trip_albums_foundation.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.enforce_album_has_items()",
    sourceMigration: "20260329170000_phase2_slice3_trip_albums_foundation.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.is_couple_member(uuid)",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.is_valid_timezone(text)",
    sourceMigration: "20260329223000_couple_timezone_foundation.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.update_couple_timezone(uuid, text)",
    sourceMigration: "20260329223000_couple_timezone_foundation.sql",
    status: "sql_authoritative",
  },
  {
    name: "storage.objects RLS policies",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "sql_authoritative",
  },
] as const;
