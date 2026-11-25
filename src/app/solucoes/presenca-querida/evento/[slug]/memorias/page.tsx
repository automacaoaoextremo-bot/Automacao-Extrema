import { PresencaPhotoPublic } from "@/components/presenca-photo-public";
export const metadata = { title: "Memórias Compartilhadas | Presença Querida", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function Page({params}:{params:Promise<{slug:string}>}) {
  return <PresencaPhotoPublic slug={(await params).slug} album={true}/>;
}
