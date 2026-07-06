import { redirect } from "next/navigation";

export default function CorrenteEmDiaFunilRedirectPage() {
  redirect("/admin/ae/funil?solution=corrente-em-dia");
}
