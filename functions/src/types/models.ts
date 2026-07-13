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

export type EstadoPresupuesto = "pendiente" | "aceptado" | "rechazado";

export interface Presupuesto {
  id: string;
  clinicaId: string;
  pacienteId: string;
  especialidadId?: string; // opcional: permite agrupar ingresos por especialidad en métricas
  tratamiento: string; // descripción libre (ej. "Ortodoncia (plan anual)")
  monto: number;
  estado: EstadoPresupuesto;
  emision: Timestamp;
}

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

export type TipoMovimientoCaja = "ingreso" | "egreso";
export type MetodoPago = "Efectivo" | "Débito" | "Transferencia" | "Tarjeta";

export interface MovimientoCaja {
  id: string;
  clinicaId: string;
  fecha: Timestamp;
  concepto: string;
  tipo: TipoMovimientoCaja;
  monto: number;
  metodo: MetodoPago;
  pacienteId?: string;
  presupuestoId?: string; // presente si es un abono/pago de un presupuesto
}
