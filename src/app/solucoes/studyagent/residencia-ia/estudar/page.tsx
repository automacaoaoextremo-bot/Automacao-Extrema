import { StudyAgentResidenciaHeader } from "@/components/education/studyagent-residencia-header";
import { StudyAgentStudentArea } from "@/components/education/studyagent-student-area";

export default function StudyAgentResidenciaIAStudyPage() {
  return (
    <>
      <StudyAgentResidenciaHeader
        actions={[
          { label: "Residência IA", href: "/solucoes/studyagent/residencia-ia" },
          { label: "Meu estudo", href: "/solucoes/studyagent/residencia-ia/estudar", primary: true },
        ]}
      />
      <StudyAgentStudentArea />
    </>
  );
}
