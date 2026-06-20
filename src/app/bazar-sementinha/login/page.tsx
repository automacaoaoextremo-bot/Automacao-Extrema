import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { LoginClient } from "./login-client";

export default function LoginPage() {
  return (
    <>
      <BazarHeader active="gestao" />
      <LoginClient />
    </>
  );
}
