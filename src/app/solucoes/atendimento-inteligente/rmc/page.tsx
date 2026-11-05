import type { Metadata } from 'next';
import { RmcLanding } from '@/components/atendimento-inteligente/rmc-landing';
export const metadata: Metadata = { title: 'Reparos RMC | Atendimento Inteligente', description: 'Solicite manutenção e reparos com o atendimento organizado da Reparos RMC.' };
export default function RmcPage() { return <RmcLanding />; }
