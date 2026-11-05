import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rmcActor, customerIsActive } from '@/lib/atendimento-inteligente/customer-auth';
import { safeError } from '@/lib/atendimento-inteligente/security';
export async function POST(request: Request) {
  try {
    const actor = await rmcActor(request);
    if (actor?.role !== 'customer' || !customerIsActive(actor.customer!))
      return NextResponse.json({ error: 'Portal nao habilitado.' }, { status: 403 });
    const body = await request.json() as { password?: string };
    const password = body.password || '';
    if (password.length < 12 || password.length > 72 ||
      [/[A-Z]/,/[a-z]/,/\d/,/[^\w]/].filter(re=>re.test(password)).length < 3) {
      return NextResponse.json({ error: 'Senha deve ter 12 a 72 caracteres e misturar letras, numeros ou simbolos.' }, { status: 400 });
    }
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(actor.userId, {password});
    if (authError) throw authError;
    const { error } = await supabaseAdmin.from('ae_ai_customers')
      .update({ must_change_password:false, updated_at:new Date().toISOString() })
      .eq('organization_id',actor.organizationId).eq('auth_user_id',actor.userId);
    if (error) throw error;
    return NextResponse.json({ ok:true });
  } catch (err) { return NextResponse.json({ error:safeError(err) }, { status:500 }); }
}
