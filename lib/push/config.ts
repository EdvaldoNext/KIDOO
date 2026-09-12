export const PUSH_ICON = "/icons/192.png";
export const PUSH_BADGE = "/icons/192.png";
export const PUSH_APPROVALS_URL = "/app/aprovacoes";

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

export function getVapidPrivateKey() {
  return process.env.VAPID_PRIVATE_KEY ?? "";
}

export function getVapidSubject() {
  return process.env.VAPID_SUBJECT ?? "mailto:suporte@kidoo.app";
}

export function getPushWebhookSecret() {
  return process.env.PUSH_WEBHOOK_SECRET ?? "";
}

export function isPushConfigured() {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey() && getPushWebhookSecret());
}
