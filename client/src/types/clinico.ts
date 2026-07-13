import type { Timestamp } from "firebase/firestore";

export interface NotaClinica {
  id: string;
  clinicaId: string;
  pacienteId: string;
  profesionalId: string;
  fecha: Timestamp;
  motivo: string;
  notas: string;
}

export interface ItemReceta {
  medicamento: string;
  indicaciones: string;
}

export interface Receta {
  id: string;
  clinicaId: string;
  pacienteId: string;
  profesionalId: string;
  fecha: Timestamp;
  items: ItemReceta[];
  observaciones?: string;
}
