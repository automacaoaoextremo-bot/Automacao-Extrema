import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
export type LucideIcon = ComponentType<IconProps>;

function BaseIcon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function MessageCircle(props: IconProps) {
  return <BaseIcon {...props}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-4.8A8 8 0 1 1 21 15Z" /></BaseIcon>;
}
export function HeartHandshake(props: IconProps) {
  return <BaseIcon {...props}><path d="M12 20s-7-4.4-9-8.5C1.4 8.3 3.5 5 7 5c2 0 3.2 1 5 3 1.8-2 3-3 5-3 3.5 0 5.6 3.3 4 6.5C19 15.6 12 20 12 20Z" /><path d="M8 11l3 2 3-2" /></BaseIcon>;
}
export function PiggyBank(props: IconProps) {
  return <BaseIcon {...props}><path d="M5 11a7 7 0 0 1 13-2h2v5h-2a7 7 0 0 1-5 4v2h-3v-2H7l-1 2H3v-5a4 4 0 0 1 2-4Z" /><path d="M14 8h.01" /></BaseIcon>;
}
export function ShieldCheck(props: IconProps) {
  return <BaseIcon {...props}><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></BaseIcon>;
}
export function Smartphone(props: IconProps) {
  return <BaseIcon {...props}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></BaseIcon>;
}
export function Trophy(props: IconProps) {
  return <BaseIcon {...props}><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M6 5H4v2a4 4 0 0 0 4 4M18 5h2v2a4 4 0 0 1-4 4M12 12v5M9 21h6M10 17h4" /></BaseIcon>;
}
export function CheckCircle2(props: IconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></BaseIcon>;
}
export function Home(props: IconProps) {
  return <BaseIcon {...props}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></BaseIcon>;
}
export function Star(props: IconProps) {
  return <BaseIcon {...props}><path d="m12 2 3 6 7 .9-5 4.8 1.3 6.8L12 17l-6.3 3.5L7 13.7 2 8.9 9 8l3-6Z" /></BaseIcon>;
}
export function X(props: IconProps) {
  return <BaseIcon {...props}><path d="M6 6l12 12M18 6 6 18" /></BaseIcon>;
}
export function HelpCircle(props: IconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1.1.8-1.1 1.6M12 17h.01" /></BaseIcon>;
}
export function TimerReset(props: IconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6M4 6l-2 2M4 13H1l2-2" /></BaseIcon>;
}
