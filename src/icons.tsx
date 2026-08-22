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
