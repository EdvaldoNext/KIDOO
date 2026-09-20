import { photoRetentionCutoff } from "@/lib/photo-retention";
import { STORAGE_BUCKET } from "@/lib/photo-key";
import { createServiceClient } from "@/utils/supabase/admin";

const BATCH_SIZE = 100;
const MAX_BATCHES = 20;

type CompletionPhoto = {
  id: string;
  photo_key: string;
};

export type PurgeExpiredPhotosResult = {
  scanned: number;
  removed: number;
  cleared: number;
};

export async function purgeExpiredTaskPhotos(): Promise<PurgeExpiredPhotosResult> {
  const admin = createServiceClient();
  const cutoff = photoRetentionCutoff().toISOString();

  let scanned = 0;
  let removed = 0;
  let cleared = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const rows = await listExpiredPhotos(admin, cutoff, BATCH_SIZE);
    if (rows.length === 0) break;

    scanned += rows.length;
    const keys = [...new Set(rows.map((row) => row.photo_key))];
    const ids = rows.map((row) => row.id);

    const { error: storageError } = await admin.storage.from(STORAGE_BUCKET).remove(keys);
    if (storageError) {
      throw new Error(storageError.message);
    }
    removed += keys.length;

    const { error: updateError } = await admin
      .from("task_completions")
      .update({ photo_key: null })
      .in("id", ids);
    if (updateError) {
      throw new Error(updateError.message);
    }
    cleared += ids.length;
  }

  return { scanned, removed, cleared };
}

async function listExpiredPhotos(
  admin: ReturnType<typeof createServiceClient>,
  cutoff: string,
  limit: number,
): Promise<CompletionPhoto[]> {
  const [approved, rejected] = await Promise.all([
    admin
      .from("task_completions")
      .select("id, photo_key")
      .not("photo_key", "is", null)
      .lt("approved_at", cutoff)
      .limit(limit),
    admin
      .from("task_completions")
      .select("id, photo_key")
      .not("photo_key", "is", null)
      .is("approved_at", null)
      .lt("rejected_at", cutoff)
      .limit(limit),
  ]);

  if (approved.error) throw new Error(approved.error.message);
  if (rejected.error) throw new Error(rejected.error.message);

  const byId = new Map<string, CompletionPhoto>();
  for (const row of [...(approved.data ?? []), ...(rejected.data ?? [])]) {
    if (!row.photo_key) continue;
    byId.set(row.id, { id: row.id, photo_key: row.photo_key });
  }
  return [...byId.values()];
}
