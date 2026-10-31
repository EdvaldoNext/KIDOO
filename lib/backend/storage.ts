import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * File storage on Cloudflare R2 (S3 compatible API).
 * Required env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
 * Photos stay private; they are only ever served through short-lived signed URLs.
 */
export type StorageError = { message: string };

let client: S3Client | null = null;

function config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 não configurado (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function s3() {
  if (client) return { client, bucket: config().bucket };
  const { accountId, accessKeyId, secretAccessKey, bucket } = config();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client, bucket };
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function removeKeys(keys: string[]) {
  const { client: r2, bucket } = s3();
  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);
    const result = await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    if (result.Errors?.length) {
      throw new Error(result.Errors[0]?.Message ?? "Falha ao apagar arquivos.");
    }
  }
}

/** Deletes every object under families/<id>/ (used when a family is erased). */
export async function removeFamilyPhotos(familyId: string) {
  const { client: r2, bucket } = s3();
  let token: string | undefined;
  do {
    const page = await r2.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: `families/${familyId}/`, ContinuationToken: token }),
    );
    const keys = (page.Contents ?? []).map((item) => item.Key).filter((key): key is string => Boolean(key));
    if (keys.length > 0) await removeKeys(keys);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

export type StorageBucket = {
  upload(
    key: string,
    body: Blob | ArrayBuffer | Uint8Array | Buffer,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ data: { path: string } | null; error: StorageError | null }>;
  remove(keys: string[]): Promise<{ data: string[] | null; error: StorageError | null }>;
  createSignedUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<{ data: { signedUrl: string } | null; error: StorageError | null }>;
  download(key: string): Promise<{ data: Uint8Array | null; contentType: string | null; error: StorageError | null }>;
};

/**
 * `name` is the logical bucket the code always used ("task-photos"); every logical bucket maps
 * to the single R2 bucket in R2_BUCKET, since object keys already start with `families/...`.
 */
export function storageBucket(name: string): StorageBucket {
  void name;
  return {
    async upload(key, body, options) {
      try {
        const { client: r2, bucket } = s3();
        const bytes =
          body instanceof Blob ? new Uint8Array(await body.arrayBuffer()) : body instanceof ArrayBuffer ? new Uint8Array(body) : body;
        await r2.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: bytes,
            ContentType: options?.contentType ?? "application/octet-stream",
          }),
        );
        return { data: { path: key }, error: null };
      } catch (error) {
        return { data: null, error: { message: message(error) } };
      }
    },

    async remove(keys) {
      try {
        if (keys.length > 0) await removeKeys(keys);
        return { data: keys, error: null };
      } catch (error) {
        return { data: null, error: { message: message(error) } };
      }
    },

    async createSignedUrl(key, expiresInSeconds) {
      try {
        const { client: r2, bucket } = s3();
        const signedUrl = await getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: key }), {
          expiresIn: expiresInSeconds,
        });
        return { data: { signedUrl }, error: null };
      } catch (error) {
        return { data: null, error: { message: message(error) } };
      }
    },

    async download(key) {
      try {
        const { client: r2, bucket } = s3();
        const result = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bytes = await result.Body?.transformToByteArray();
        return { data: bytes ?? null, contentType: result.ContentType ?? null, error: null };
      } catch (error) {
        return { data: null, contentType: null, error: { message: message(error) } };
      }
    },
  };
}
