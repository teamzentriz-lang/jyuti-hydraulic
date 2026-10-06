# Media storage

The CMS stores file bytes outside PostgreSQL. The database keeps metadata and a provider-independent `storageKey`.

## Architecture

```text
CMS / Media API
      ↓
StorageService
      ↓
 LocalStorageProvider  |  R2StorageProvider
      ↓                        ↓
public/uploads/          Cloudflare R2
```

WordPress migration and admin uploads should call `storageService.upload()` or `saveUpload()` — not write to the filesystem directly.

## Development (local)

```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=public/uploads
LOCAL_STORAGE_URL=/uploads
```

Files are written to `{project}/public/uploads/{storageKey}` and served as `{LOCAL_STORAGE_URL}/{storageKey}` (default `/uploads/...`).

Legacy uploads under `./storage/` (older keys such as `media/YYYY/MM/...`) are still read and deleted when needed. New uploads use `public/uploads/`.

`STORAGE_DRIVER=local` is still accepted as an alias for `STORAGE_PROVIDER`.

## Production (Cloudflare R2)

```env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

`R2_BUCKET` is supported as an alias for `R2_BUCKET_NAME`.

Create R2 API tokens in the Cloudflare dashboard (R2 → Manage R2 API Tokens). Use a custom domain or public bucket URL for `R2_PUBLIC_URL`. Credentials are server-side only.

When `STORAGE_PROVIDER=local`, the app does **not** initialize the R2 client.

## Storage keys

Examples:

```text
products/hydraulic-cylinders/{id}-image-1.webp
library/2026/03/{id}-photo.webp
```

Pass an optional `prefix` (or `folder`) field when uploading via `POST /api/admin/media/` to control the key prefix. Admin uploads without a prefix default to `library/{year}/{month}/`.

## Migrate local files to R2

This is separate from WordPress → CMS migration.

```bash
npm run storage:migrate-to-r2
```

Dry run (no uploads or DB updates):

```bash
npm run storage:migrate-to-r2 -- --dry-run
```

Optional batch size:

```bash
npm run storage:migrate-to-r2 -- --batch=25
```

The command:

1. Loads `media` rows with `storage_driver = local`
2. Skips objects that already exist on R2 (updates DB if needed)
3. Uploads using the **same** `storageKey`
4. Sets `storage_driver = r2` and refreshes `url`

Safe to re-run after partial failures.

## Tests

```bash
npm test
```
