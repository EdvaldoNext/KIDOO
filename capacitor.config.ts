import { readFileSync } from "fs";
import type { CapacitorConfig } from "@capacitor/cli";

function env(name: string, fallback: string) {
  if (process.env[name]) return process.env[name] as string;
  try {
    const text = readFileSync(".env.local", "utf8");
    const match = text.match(new RegExp(`^${name}=(.*)$`, "m"));
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    // no local env file
  }
  return fallback;
}

const config: CapacitorConfig = {
  appId: "app.kidoo.kids",
  appName: "KIDOO Filhos",
  webDir: "public",
  server: {
    url: env("KIDOO_NATIVE_URL", "http://10.0.2.2:3000"),
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
