import { StudyAgentResidenciaHeader } from "@/components/education/studyagent-residencia-header";
import { StudyAgentAccess } from "@/components/education/studyagent-access";

export default function StudyAgentResidenciaIAAccessPage() {
  return (
    <>
      <StudyAgentResidenciaHeader
        actions={[
          { label: "Início", href: "/solucoes/studyagent/residencia-ia" },
          { label: "Ajuda", href: "/#contato" },
        ]}
      />
      <StudyAgentAccess />
    </>
  );
}
