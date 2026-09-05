import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";

export function InstallKidsApp() {
  return (
    <InstallAppPrompt
      dismissKey="kidoo-install-dismissed"
      title="Coloque o KIDOO na tela inicial"
      description="Assim você abre direto nas suas tarefas, sem digitar a chave de novo."
    />
  );
}
