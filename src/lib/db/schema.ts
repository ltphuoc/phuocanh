export interface DrizzleBaselineEntity {
  readonly name: string;
  readonly sourceMigration: string;
  readonly status: "planned_mirror" | "sql_authoritative";
}

export const phaseOneTableBaseline: readonly DrizzleBaselineEntity[] = [
  { name: "public.couples", sourceMigration: "20260327214000_phase1_mvp.sql", status: "planned_mirror" },
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
] as const;

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
    name: "public.is_couple_member(uuid)",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "sql_authoritative",
  },
  {
    name: "storage.objects RLS policies",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "sql_authoritative",
  },
] as const;
