# Albums Manual Tests

## Feature Summary
- Covers album creation from trip detail, media append, album detail, and album index visibility.

## Routes Covered
- `/trips/[tripId]`
- `/albums`
- `/albums/[albumId]`

## Preconditions
- User is authenticated in a ready couple context.
- One trip exists with eligible memory media in the trip window.
- Use debug token format `DBG-ALBUM-<YYYYMMDD>-<INITIALS>-<NN>`.

## Required Test Data
- One album title and note containing the debug token.
- At least two eligible trip-linked memory media items.

## Core Smoke Cases
### MAN-ALBUM-001 Create an album from trip detail
1. Open the trip detail route.
2. Create an album using one eligible media item and the debug token.
3. Confirm the linked album appears on the trip detail route.
4. Open the album detail route.

Expected result:
- Album creation succeeds and the album is visible from both trip detail and album detail.

Failure triage:
- Route: `/trips/[tripId]`, `/albums/[albumId]`
- Action: `createAlbumAction`
- Read helper: `getTripDetailData(...)`, `getAlbumDetailData(...)`
- RPC: `create_album_with_items(...)`

### MAN-ALBUM-002 Add more media and confirm the album index updates
1. Return to the same trip detail route.
2. Add another eligible media item to the existing album.
3. Open `/albums`.
4. Confirm the album card shows the expected item count.

Expected result:
- Additional eligible media is appended once and reflected on both album detail and album index.

Failure triage:
- Route: `/trips/[tripId]`, `/albums`, `/albums/[albumId]`
- Action: `addAlbumItemsAction`
- Read helper: `getTripDetailData(...)`, `getAlbumsPageData(...)`, `getAlbumDetailData(...)`
- RPC: `add_album_items(...)`

## Automated Coverage
- `E2E-ALBUM-001`
