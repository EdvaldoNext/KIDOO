export const PHOTO_RETENTION_DAYS = 15;

export function photoRetentionCutoff(now = new Date()) {
  return new Date(now.getTime() - PHOTO_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
