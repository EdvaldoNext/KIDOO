import { KidsPhoneSetup } from "@/components/kids/KidsPhoneSetup";

export function InstallKidsApp({ required = false }: { required?: boolean }) {
  return <KidsPhoneSetup required={required} />;
}
