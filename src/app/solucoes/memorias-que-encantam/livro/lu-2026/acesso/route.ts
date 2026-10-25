/** Leitura pública na V3. Endpoint legado mantido apenas como redirecionamento. */
import { NextRequest,NextResponse } from "next/server";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
export async function POST(req:NextRequest){return NextResponse.redirect(new URL(LU_BASE_PATH,req.url),303);}
