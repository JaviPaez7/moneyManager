import type { ReactNode } from "react";

type IconProps = {
  size?: number;
  className?: string;
};

function Svg({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconChevron({ dir = "left", ...props }: IconProps & { dir?: "left" | "right" }) {
  return (
    <Svg {...props}>
      {dir === "left" ? <path d="M15 5 8 12l7 7" /> : <path d="m9 5 7 7-7 7" />}
    </Svg>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 7h9a4 4 0 0 1 4 4v1" />
      <path d="m12 3 4 4-4 4" />
      <path d="M17 17H8a4 4 0 0 1-4-4v-1" />
      <path d="m12 21-4-4 4-4" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path d="m14.5 5.5 4 4" />
    </Svg>
  );
}

export function IconArrowOut(props: IconProps) {
  // Sacar de un bote: la flecha sale del recipiente. Antes era idéntica a la
  // de Ingreso (una flecha arriba a secas) y confundía entrada con salida.
  return (
    <Svg {...props}>
      <path d="M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
    </Svg>
  );
}

export function IconExpense(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 7l10 10M17 7v10H7" />
    </Svg>
  );
}

export function IconIncome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 17L17 7M7 7h10v10" />
    </Svg>
  );
}

export function IconSaving(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 11V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      <path d="M14 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
      <path d="M18 12h3" />
    </Svg>
  );
}

export function NetoBrandIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="neto-brand-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent, #7B61FF)" />
          <stop offset="100%" stopColor="var(--accent-2, #3E7BFA)" />
        </linearGradient>
      </defs>
      <rect x="20" y="24" width="60" height="11" rx="5.5" fill="currentColor" />
      <rect x="20" y="44" width="40" height="11" rx="5.5" fill="currentColor" opacity="0.45" />
      <rect x="20" y="64" width="24" height="11" rx="5.5" fill="url(#neto-brand-g)" />
    </svg>
  );
}

export function IconGoogle({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

