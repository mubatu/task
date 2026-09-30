import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function HomeIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>;
}

export function CalendarIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>;
}

export function CheckIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m5 12 4 4L19 6"/></svg>;
}

export function EditIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/><path d="m13 6 5 5"/></svg>;
}

export function PlusIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M12 5v14M5 12h14"/></svg>;
}

export function BellIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
}

export function ClockIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
}

export function TaskIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
}

export function ChevronLeftIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m15 18-6-6 6-6"/></svg>;
}

export function ChevronRightIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m9 18 6-6-6-6"/></svg>;
}

export function CloseIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m6 6 12 12M18 6 6 18"/></svg>;
}

export function UserIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
}

export function WifiOffIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m2 2 20 20M8.5 8.5A10 10 0 0 1 21 9M5 12.5a10 10 0 0 1 4.5-2.7M8.5 16.5A5 5 0 0 1 15 16M12 20h.01"/></svg>;
}
