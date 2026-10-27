import { processTucxaDailySummaries } from "@/lib/organizacao-em-harmonia/tucxa-daily-summary-dispatcher";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
/** Prévia matinal, independente dos disparos da tarde: 08h em Campinas. */
export async function GET(request: Request) { return processTucxaDailySummaries(request, "morning"); }
