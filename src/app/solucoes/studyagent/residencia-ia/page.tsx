import { StudyAgentResidenciaHeader } from "@/components/education/studyagent-residencia-header";
import { StudyAgentResidenciaPublic } from "@/components/education/studyagent-residencia-public";

export default function StudyAgentResidenciaIAPage() {
  return (
    <>
      <StudyAgentResidenciaHeader
        actions={[
          { label: "Entrar", href: "/solucoes/studyagent/residencia-ia/acesso" },
          { label: "Cadastrar", href: "/solucoes/studyagent/residencia-ia/acesso?modo=cadastro", primary: true },
        ]}
      />
      <StudyAgentResidenciaPublic />
    </>
  );
}
