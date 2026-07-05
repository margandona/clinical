import type { Timestamp } from "firebase-admin/firestore";

// Todas las colecciones principales llevan clinicaId desde el diseño
// (Opción 3 de la pregunta ⭐10 en Contexto/03-preguntas-abiertas.md):
// preparado para multi-clínica sin activarlo en el MVP.

export type Rol = "admin" | "secretaria" | "dentista" | "paciente";

export interface Clinica {
  id: string;
  nombre: string;
}

export interface Especialidad {
  id: string;
  clinicaId: string;
  nombre: string;
  duracionMinutosDefault: number;
}

export interface Box {
  id: string;
  clinicaId: string;
  nombre: string;
  tipo: "dental" | "medico";
}

export interface Profesional {
  id: string;
  clinicaId: string;
  nombre: string;
  especialidadIds: string[];
}

export interface Paciente {
  id: string; // RUT, identificador principal (ver Contexto/03, punto 5)
  clinicaId: string;
  nombre: string;
  telefono?: string;
  bloqueado: boolean;
}

export interface UsuarioRol {
  uid: string;
  clinicaId: string;
  rol: Rol;
  email: string;
  profesionalId?: string; // presente si rol === "dentista"
  pacienteId?: string; // presente si rol === "paciente" (RUT)
}

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
