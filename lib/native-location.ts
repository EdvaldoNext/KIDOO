import { Capacitor, WebPlugin, registerPlugin } from "@capacitor/core";

export type NativeLocationStartResult = {
  running?: boolean;
  needsSettings?: boolean;
  message?: string;
};

export type NativeLocationStatus = {
  running: boolean;
  backgroundGranted?: boolean;
};

export interface KidooLocationPlugin {
  start(options: { endpoint: string; token: string }): Promise<NativeLocationStartResult>;
  stop(): Promise<void>;
  status(): Promise<NativeLocationStatus>;
  openSettings(): Promise<void>;
}

class KidooLocationWeb extends WebPlugin implements KidooLocationPlugin {
  async start(): Promise<NativeLocationStartResult> {
    return { running: false };
  }
  async stop(): Promise<void> {}
  async status(): Promise<NativeLocationStatus> {
    return { running: false };
  }
  async openSettings(): Promise<void> {}
}

export const KidooLocation = registerPlugin<KidooLocationPlugin>("KidooLocation", {
  web: () => new KidooLocationWeb(),
});

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
