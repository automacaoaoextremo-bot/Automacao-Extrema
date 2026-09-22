import { AuthLoginCard } from "@/components/impacto-no-controle/AuthLoginCard";

export default function LoginPage() {
  return (
    <AuthLoginCard
      title="Gestão"
      description="Acesse clientes, campanhas, aprovações, mensagens e prestação de contas."
      defaultEmail="impactonocontrole@gmail.com"
    />
  );
}
