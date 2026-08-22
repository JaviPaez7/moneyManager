import { IconClose } from "./icons";
import type { SnackState } from "./lib/useSnack";

/** La cinta flotante de confirmación. Cerrar da la acción por buena; Deshacer
 *  la revierte mientras esté a tiempo. */
export default function Snack({
  snack,
  onUndo,
  onClose,
}: {
  snack: SnackState;
  onUndo: () => void;
  onClose: () => void;
}) {
  if (!snack) return null;
  return (
    <div className="snack" role="status">
      <span className="snack-msg">{snack.msg}</span>
      {snack.actionLabel && (
        <button type="button" className="snack-action" onClick={onUndo}>
          {snack.actionLabel}
        </button>
      )}
      <button type="button" className="snack-close" aria-label="Cerrar aviso" onClick={onClose}>
        <IconClose size={16} />
      </button>
    </div>
  );
}
