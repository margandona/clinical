// Mirror liviano de functions/src/types/models.ts para las citas que
// gestiona el módulo de Agenda.

import type { Timestamp } from "firebase/firestore";

export type EstadoCita =
  | "reservada"
  | "confirmada"
  | "cancelada"
  | "inasistencia"
  | "atendida";

export interface Cita {
  id: string;
  clinicaId: string;
  pacienteId: string;
  profesionalId: string;
  boxId: string;
  especialidadId: string;
  inicio: Timestamp;
  duracionMinutos: number;
  estado: EstadoCita;
  esSobrecupo: boolean;
}

// Buffer fijo de limpieza/preparación aplicado después de cada cita en un
// mismo box. Confirmado que existe (Contexto/03-preguntas-abiertas.md,
// punto 3) pero su duración exacta no se ha definido todavía — 15 min es
// un valor provisorio hasta que se confirme con la clínica.
export const BUFFER_BOX_MINUTOS = 15;
