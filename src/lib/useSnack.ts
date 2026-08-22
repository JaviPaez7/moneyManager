import { useCallback, useRef, useState } from "react";

export type SnackState = { msg: string; actionLabel?: string } | null;

type QueueOpts = {
  msg: string;
  actionLabel?: string;
  /** Qué deshacer si pulsan la acción antes de que la cinta caduque. */
  onUndo?: () => void;
  /** Qué confirmar cuando la cinta caduca o se cierra (p. ej. borrar de verdad). */
  onCommit?: () => void;
};

/**
 * La cinta de confirmación de abajo, con «Deshacer» opcional. Solo hay una a la
 * vez: si llega otra acción, la anterior se da por buena y se confirma ya.
 *
 * El truco del borrado con deshacer es que el commit se aplica al servidor solo
 * cuando la cinta caduca (5 s). Así «Deshacer» no revierte nada en el
 * servidor: es que aún no había pasado. Si te vas de la app antes, tampoco se
 * borra — un accidente sobrevive, que es lo prudente.
 */
export function useSnack() {
  const [snack, setSnack] = useState<SnackState>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onCommit = useRef<(() => void) | null>(null);
  const onUndo = useRef<(() => void) | null>(null);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const commit = onCommit.current;
    onCommit.current = null;
    onUndo.current = null;
    setSnack(null);
    if (commit) commit();
  }, []);

  const queue = useCallback(
    (opts: QueueOpts) => {
      flush(); // lo pendiente se confirma antes de encolar lo nuevo
      onCommit.current = opts.onCommit ?? null;
      onUndo.current = opts.onUndo ?? null;
      setSnack({ msg: opts.msg, actionLabel: opts.actionLabel });
      timer.current = setTimeout(flush, 5000);
    },
    [flush],
  );

  const undo = useCallback(() => {
    clearTimeout(timer.current);
    const revert = onUndo.current;
    onCommit.current = null;
    onUndo.current = null;
    setSnack(null);
    if (revert) revert();
  }, []);

  return { snack, queue, undo, flush };
}
