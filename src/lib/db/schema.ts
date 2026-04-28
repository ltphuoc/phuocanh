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
    name: "public.reminder_deliveries",
    sourceMigration: "20260331120000_phase2_closeout_reminders_encrypted_future_notes.sql",
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
  {
    name: "public.game_rounds",
    sourceMigration: "20260402100000_phase3_slice1_games_stats_foundation.sql",
    status: "planned_mirror",
  },
  {
    name: "public.game_round_answers",
    sourceMigration: "20260402100000_phase3_slice1_games_stats_foundation.sql",
    status: "planned_mirror",
  },
  {
    name: "public.game_round_memory_targets",
    sourceMigration: "20260428121000_phase3_slice2_guess_date_runtime.sql",
    status: "planned_mirror",
  },
  {
    name: "public.game_round_trivia_targets",
    sourceMigration: "20260428131000_phase3_slice3_trivia_runtime.sql",
    status: "planned_mirror",
  },
] as const;

export const phaseOneTableBaseline = appTableBaseline;

export const sqlAuthoritativeObjects: readonly DrizzleBaselineEntity[] = [
  {
    name: "public.bootstrap_first_couple(date, text, text)",
    sourceMigration: "20260330001000_onboarding_bootstrap_timezone.sql",
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
    name: "public.create_future_note_with_body(text, timestamptz, text)",
    sourceMigration: "20260331120000_phase2_closeout_reminders_encrypted_future_notes.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.get_unlocked_future_note_contents(uuid)",
    sourceMigration: "20260331120000_phase2_closeout_reminders_encrypted_future_notes.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.enqueue_due_reminder_deliveries()",
    sourceMigration: "20260331120000_phase2_closeout_reminders_encrypted_future_notes.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.claim_reminder_deliveries(integer)",
    sourceMigration: "20260331120000_phase2_closeout_reminders_encrypted_future_notes.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.invoke_reminder_processor()",
    sourceMigration: "20260331120000_phase2_closeout_reminders_encrypted_future_notes.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.configure_phase2_reminder_jobs()",
    sourceMigration: "20260331120000_phase2_closeout_reminders_encrypted_future_notes.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.ensure_daily_question_round(game_mode, date, text, text, text)",
    sourceMigration: "20260402100000_phase3_slice1_games_stats_foundation.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.submit_daily_question_answer(uuid, text)",
    sourceMigration: "20260402100000_phase3_slice1_games_stats_foundation.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.get_daily_question_round_state(date)",
    sourceMigration: "20260402143000_phase3_slice1_gameplay_contract_hardening.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.get_daily_question_stats(integer)",
    sourceMigration: "20260411110000_fix_daily_question_stats_today_timezone.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.ensure_guess_date_round(date)",
    sourceMigration: "20260428121000_phase3_slice2_guess_date_runtime.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.submit_guess_date_answer(uuid, date)",
    sourceMigration: "20260428121000_phase3_slice2_guess_date_runtime.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.get_guess_date_round_state(date)",
    sourceMigration: "20260428121000_phase3_slice2_guess_date_runtime.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.ensure_trivia_round(date)",
    sourceMigration: "20260428131000_phase3_slice3_trivia_runtime.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.submit_trivia_answer(uuid, text)",
    sourceMigration: "20260428131000_phase3_slice3_trivia_runtime.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.get_trivia_round_state(date)",
    sourceMigration: "20260428131000_phase3_slice3_trivia_runtime.sql",
    status: "sql_authoritative",
  },
  {
    name: "public.has_any_couple()",
    sourceMigration: "20260417103000_add_has_any_couple_rpc.sql",
    status: "sql_authoritative",
  },
  {
    name: "storage.objects RLS policies",
    sourceMigration: "20260327214000_phase1_mvp.sql",
    status: "sql_authoritative",
  },
] as const;
