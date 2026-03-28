# Business Rules

This file is the canonical business-rule reference for the current app. If this file and code disagree, SQL migrations win for schema/security behavior.

## Global Invariants
- The product is a single private couple space for exactly two users.
- The database currently enforces a global singleton couple space via a unique expression index on `public.couples ((true))`.
- A couple can have at most two active memberships.
- Each active role is unique within a couple: only one active `partner_a` and one active `partner_b`.
- Membership and invite safety rules are enforced in SQL, not just in UI or Server Actions.

## Membership Roles And States
- Roles are `partner_a` and `partner_b`.
- Membership status values are `active` and `inactive`.
- The current app only creates `active` memberships. There is no UI flow for deactivation yet.
- The first successful bootstrap always creates `partner_a`.
- Later invite acceptance assigns the missing active role in the couple.
- If the invite target user is already an active member of that couple, invite acceptance returns the existing role and marks the invite accepted.

## Couple Bootstrap Rules
- Bootstrap is only allowed through the `bootstrap_first_couple(started_date, couple_name)` RPC.
- The RPC uses a transaction-level advisory lock to prevent concurrent creation of duplicate couple spaces.
- If no couple exists, the authenticated user becomes `partner_a` in the new singleton couple.
- If a couple already exists and the authenticated user is already an active member, bootstrap returns the existing couple context.
- If a couple already exists and the authenticated user is not a member, bootstrap must not attach them implicitly. They must join through an invite.

## Invite Lifecycle
- Invites are created by an active couple member through `createInviteAction`.
- Invite tokens are UUIDs and expire 14 days after creation.
- Invite acceptance is only allowed through the `accept_couple_invite(invite_token)` RPC.
- Only unused invites (`accepted_at is null`) can be accepted.
- Expired invites fail.
- If the couple already has two active members, invite acceptance fails with `COUPLE_FULL`.
- Successful invite acceptance creates an active membership, records `accepted_at`, and records `accepted_by_user_id`.

## Memory And Media Rules
- A memory currently requires either:
- a non-empty note, or
- one uploaded media file
- The current UI supports at most one uploaded file per memory submission, even though the data model allows multiple media rows per memory.
- Supported media types are images and videos only.
- The app-level upload limit is `25MB`.
- Memory media is stored in the private `memory-media` bucket.
- Storage object names must follow the contract `couples/{coupleId}/memories/{memoryId}/{timestamp}-{safeFileName}`.
- If media upload or media metadata insert fails, the app attempts rollback so partial storage/database state is not left behind.

## Lists And Checklists
- Wish items are couple-scoped and member-visible through RLS.
- Checklists are couple-scoped and member-visible through RLS.
- Checklist item writes are authorized through the parent checklist’s couple membership in SQL.
- Checklist item actions do not need to fetch the couple context explicitly because RLS enforces the parent checklist relationship.

## Forbidden States
- More than one `couples` row
- More than two active memberships in a couple
- Two active `partner_a` memberships in one couple
- Two active `partner_b` memberships in one couple
- Direct app-layer join flow that writes `couples` or `couple_memberships` without RPCs
- Storage objects in `memory-media` whose path does not begin with `couples/{uuid}/...`

## Enforcement Map
- Singleton couple space: SQL unique index
- Max two active members: SQL trigger
- Unique active roles: SQL partial unique index
- Direct membership/couple creation from app layer: blocked by RLS and replaced by RPCs
- Invite validity, expiration, and role assignment: SQL RPC
- Couple membership read/write visibility: RLS helper `is_couple_member(...)`
- Storage object access: storage policies using the couple ID embedded in the object path

## User-Visible Failure States
- Login can fail if Supabase Auth is unreachable.
- Invite acceptance can fail with:
- invalid or already used invite
- expired invite
- couple already full
- not signed in
- Memory create can fail if:
- note and media are both empty
- file is larger than `25MB`
- file is not an image or video
- upload, media metadata insert, or later writes fail

## Current Shell Boundaries
- `/chat` is mock-only because it renders sample conversation content.
- `/map`, `/trips`, `/trips/[tripId]`, `/albums/[albumId]`, `/countdowns`, `/future-notes`, `/games`, `/games/[mode]`, `/stats`, and `/settings` are shell-only.
- Shell-only and mock-only routes must not be treated as proof that backend tables, jobs, or APIs exist.
