import { AuthLoginCard } from "@/components/impacto-no-controle/AuthLoginCard";

export default function ClientLoginPage() {
  return (
    <AuthLoginCard
      title="Área do Cliente"
      description="Entre para configurar suas ações, acompanhar pagamentos, copiar mensagens e publicar prestação de contas."
      defaultEmail="bazardosementinha@gmail.com"
    />
  );
}
