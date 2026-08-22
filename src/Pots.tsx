import { useMemo, useState, type FormEvent } from "react";
import { IconArrowOut, IconPlus } from "./icons";
import { formatEUR, parseAmount } from "./lib/format";
import { potTotals } from "./lib/summary";
import type { SavingPot, Tx } from "./lib/types";

/**
 * Los botes de ahorro. Cada uno se puede renombrar, vaciar un poco o borrar,
 * y solo uno está abierto en cada momento: son formularios dentro de la lista,
 * no diálogos, para no sacar a nadie de la pantalla.
 */
export default function Pots({
  pots,
  txs,
  savingTotal,
  busy,
  onCreate,
  onWithdraw,
  onRename,
  onDelete,
  onError,
}: {
  pots: SavingPot[];
  txs: Tx[];
  savingTotal: number;
  busy: boolean;
  onCreate: (name: string, target: number) => void;
  onWithdraw: (potId: string, importe: number, nota: string) => Promise<unknown>;
  onRename: (potId: string, name: string) => Promise<unknown>;
  onDelete: (potId: string) => void;
  onError: (message: string | null) => void;
}) {
  const [sacandoDe, setSacandoDe] = useState<string | null>(null);
  const [renombrando, setRenombrando] = useState<string | null>(null);
  const totales = useMemo(() => potTotals(txs), [txs]);

  function nuevoBote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const target = parseAmount(String(data.get("target") || "")) || 0;
    e.currentTarget.reset();
    onCreate(name, target);
  }

  return (
    <section className="pots">
      <div className="pots-head">
        <div>
          <h2>Ahorro</h2>
          <p>Botes que van creciendo mes a mes. Este mes: {formatEUR(savingTotal)}.</p>
        </div>
      </div>
      {pots.length === 0 ? (
        <form className="new-pot" onSubmit={nuevoBote}>
          <p>Crea el primero: emergencia, viaje, entrada del piso…</p>
          <div className="pair">
            <label>
              Nombre
              <input name="name" placeholder="Fondo de emergencia" required />
            </label>
            <label>
              Meta
              <input name="target" inputMode="decimal" placeholder="1.000" />
            </label>
          </div>
          <button type="submit" className="ghost" disabled={busy}>
            <IconPlus size={16} /> Crear bote
          </button>
        </form>
      ) : (
        <ul className="pot-grid">
          {pots.map((pot) => {
            const saved = totales.get(pot.id) || 0;
            const ratio = pot.target > 0 ? Math.min(1, saved / pot.target) : 0;
            return (
              <li key={pot.id}>
                <div className="bar-meta">
                  {renombrando === pot.id ? (
                    <form
                      className="pot-rename"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const valor = String(new FormData(e.currentTarget).get("nombre") || "").trim();
                        if (!valor || valor === pot.name) return setRenombrando(null);
                        // Si el guardado falla, el formulario se queda abierto
                        // con lo escrito para poder reintentar.
                        if (await onRename(pot.id, valor)) setRenombrando(null);
                      }}
                    >
                      <input name="nombre" defaultValue={pot.name} maxLength={60} autoFocus required />
                      <button type="submit" className="text-btn" disabled={busy}>
                        Guardar
                      </button>
                      <button type="button" className="text-btn" onClick={() => setRenombrando(null)}>
                        Dejarlo
                      </button>
                    </form>
                  ) : (
                    <strong>{pot.name}</strong>
                  )}
                  <span>
                    {formatEUR(saved)}
                    {pot.target > 0 ? ` / ${formatEUR(pot.target)}` : ""}
                  </span>
                </div>
                {pot.target > 0 && (
                  <div className="bar-track" aria-hidden>
                    <div className="bar-fill" style={{ width: `${ratio * 100}%` }} />
                  </div>
                )}

                {sacandoDe === pot.id ? (
                  <form
                    className="pot-out"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const datos = new FormData(e.currentTarget);
                      const importe = parseAmount(String(datos.get("importe") || ""));
                      if (importe == null) return;
                      if (importe > saved) {
                        onError(`En «${pot.name}» solo hay ${formatEUR(saved)}.`);
                        return;
                      }
                      const nota = String(datos.get("nota") || "").trim() || `De ${pot.name}`;
                      if (await onWithdraw(pot.id, importe, nota)) setSacandoDe(null);
                    }}
                  >
                    <div className="pair">
                      <label>
                        Cuánto sacas
                        <input name="importe" inputMode="decimal" placeholder="0,00" autoFocus required />
                      </label>
                      <label>
                        Para qué
                        <input name="nota" placeholder="Opcional" maxLength={80} />
                      </label>
                    </div>
                    <div className="edit-actions">
                      <button type="submit" className="ghost small" disabled={busy}>
                        Sacar
                      </button>
                      <button type="button" className="text-btn" onClick={() => setSacandoDe(null)}>
                        Dejarlo
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pot-actions">
                    <button type="button" className="text-btn" onClick={() => setRenombrando(pot.id)}>
                      Renombrar
                    </button>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => {
                        setSacandoDe(pot.id);
                        onError(null);
                      }}
                      disabled={saved <= 0}
                      title={saved <= 0 ? "Este bote está vacío" : "Sacar dinero del bote"}
                    >
                      <IconArrowOut size={13} /> Sacar
                    </button>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => {
                        const aviso =
                          saved > 0
                            ? `«${pot.name}» tiene ${formatEUR(saved)} apartados. Si lo borras, esos movimientos se quedan pero sin bote. ¿Sigo?`
                            : `¿Borro el bote «${pot.name}»?`;
                        if (confirm(aviso)) onDelete(pot.id);
                      }}
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          <li className="pot-add">
            <form onSubmit={nuevoBote}>
              <label>
                Otro bote
                <input name="name" placeholder="Nombre" required />
              </label>
              <div className="pair">
                <label>
                  Meta
                  <input name="target" inputMode="decimal" placeholder="Opcional" />
                </label>
                <button type="submit" className="ghost" disabled={busy}>
                  Añadir
                </button>
              </div>
            </form>
          </li>
        </ul>
      )}
    </section>
  );
}
