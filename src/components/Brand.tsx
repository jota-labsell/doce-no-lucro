import { CakeSlice } from "lucide-react";
export function Brand() {
  return (
    <span className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <CakeSlice size={25} strokeWidth={1.7} />
      </span>
      <span>
        Doce no Lucro<small>GESTÃO PARA CONFEITARIAS</small>
      </span>
    </span>
  );
}
