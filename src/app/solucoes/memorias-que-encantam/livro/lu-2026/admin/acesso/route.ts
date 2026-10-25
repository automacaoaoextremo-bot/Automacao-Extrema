/** Endpoint antigo de código compartilhado desabilitado na V3. */
import { NextRequest,NextResponse } from "next/server";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";
export async function POST(req:NextRequest){return NextResponse.redirect(new URL(`${LU_BASE_PATH}/admin`,req.url),303);}
