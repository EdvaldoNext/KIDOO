import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";

export function InstallParentApp() {
  return (
    <InstallAppPrompt
      dismissKey="kidoo-install-dismissed-parents"
      title="Instale o KIDOO no celular"
      description="O atalho abre direto no painel da família, para criar tarefas e aprovar fotos."
    />
  );
}
