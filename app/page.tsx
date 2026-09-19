import { DevModeBanner } from "@/components/DevModeBanner";
import { WelcomeScreen } from "@/components/welcome/WelcomeScreen";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <DevModeBanner />
      <div className="min-h-0 flex-1">
        <WelcomeScreen />
      </div>
    </div>
  );
}
