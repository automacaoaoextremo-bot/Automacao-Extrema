import { NextResponse } from 'next/server';
import { rmcActor, customerIsActive } from '@/lib/atendimento-inteligente/customer-auth';
import { safeError } from '@/lib/atendimento-inteligente/security';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const actor = await rmcActor(request);
    if (!actor) return NextResponse.json({ error: 'Usuario sem acesso a esta empresa.' }, { status: 403 });
    return NextResponse.json({
      role: actor.role, name: actor.name,
      portalEnabled: actor.role === 'customer' ? customerIsActive(actor.customer!) : true,
      mustChangePassword: actor.role === 'customer' ? actor.customer!.must_change_password : false,
    });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
