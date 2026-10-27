import { processTucxaDailySummaries } from "@/lib/organizacao-em-harmonia/tucxa-daily-summary-dispatcher";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
/** Atualização da tarde e resumo dos cavalinhos: 16h em Campinas. */
export async function GET(request: Request) { return processTucxaDailySummaries(request, "afternoon"); }
