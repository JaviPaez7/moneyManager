import { IconChevron } from "./icons";
import { monthLabel, shiftMonth } from "./lib/format";
import { pb, type AuthUser } from "./lib/pb";

export default function TopBar({
  user,
  month,
  onMonth,
  shared,
  pwOpen,
  onTogglePassword,
}: {
  user: AuthUser;
  month: string;
  onMonth: (month: string) => void;
  shared: boolean;
  pwOpen: boolean;
  onTogglePassword: () => void;
}) {
  return (
    <header className="top">
      <div>
        <h1>Neto</h1>
        <p className="lede">
          Lo que cobras, lo que se repite solo y lo que apartas.
          {shared ? " Este libro lo lleváis entre varios." : ""}
        </p>
      </div>
      <div className="top-right">
        <div className="month-nav" role="group" aria-label="Mes">
          <button type="button" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
            <IconChevron dir="left" />
          </button>
          <span>{monthLabel(month)}</span>
          <button type="button" onClick={() => onMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">
            <IconChevron dir="right" />
          </button>
        </div>
        <div className="who">
          <span>{user.name}</span>
          <button type="button" className="text-btn" onClick={onTogglePassword} aria-expanded={pwOpen}>
            Contraseña
          </button>
          <button type="button" className="text-btn" onClick={() => pb.authStore.clear()}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
