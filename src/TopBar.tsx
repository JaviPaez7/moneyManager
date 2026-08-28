import { useEffect, useRef, useState } from "react";
import { IconChevron } from "./icons";
import { colorDe, inicial } from "./lib/avatar";
import { monthLabel, shiftMonth } from "./lib/format";
import { pb, type AuthUser } from "./lib/pb";

export default function TopBar({
  user,
  month,
  onMonth,
  pwOpen,
  onTogglePassword,
}: {
  user: AuthUser;
  month: string;
  onMonth: (month: string) => void;
  pwOpen: boolean;
  onTogglePassword: () => void;
}) {
  const [cuenta, setCuenta] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cuenta) return;
    function fuera(e: PointerEvent) {
      if (menu.current && !menu.current.contains(e.target as Node)) setCuenta(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setCuenta(false);
    }
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [cuenta]);

  return (
    <header className="top">
      <h1>Neto</h1>
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
        <div className="account" ref={menu}>
          <button
            type="button"
            className="account-btn"
            aria-expanded={cuenta}
            aria-haspopup="menu"
            aria-label={`Cuenta de ${user.name}`}
            onClick={() => setCuenta((abierto) => !abierto)}
          >
            <span className="av account-av" style={{ background: colorDe(user.name) }} aria-hidden>
              {inicial(user.name)}
            </span>
          </button>
          {cuenta && (
            <div className="account-menu" role="menu">
              <p className="account-name">{user.name}</p>
              <button
                type="button"
                role="menuitem"
                className="text-btn"
                aria-expanded={pwOpen}
                onClick={() => {
                  setCuenta(false);
                  onTogglePassword();
                }}
              >
                Contraseña
              </button>
              <button type="button" role="menuitem" className="text-btn" onClick={() => pb.authStore.clear()}>
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
