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
  comisionPorcentaje: number; // % sobre lo efectivamente cobrado en caja de sus tratamientos
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
  rut?: string; // obligatorio para admin/secretaria/dentista; el paciente ya usa su RUT como pacienteId
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
  profesionalId: string; // doctor dueño del tratamiento (obligatorio: habilita el cálculo de comisiones)
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
  profesionalId?: string; // derivado del presupuesto vinculado; sin esto no cuenta para comisiones
}

// E-landing: contenido de marketing de la home pública, editable por el
// admin. `orden` controla la posición (ascendente) y `activo` permite
// ocultar un item sin borrarlo (mismo patrón que `bloqueado` en Paciente).

export interface Banner {
  id: string;
  clinicaId: string;
  titulo: string;
  imagenUrl: string;
  linkUrl?: string;
  orden: number;
  activo: boolean;
}

export interface Destacado {
  id: string;
  clinicaId: string;
  nombre: string;
  descripcion?: string;
  imagenUrl: string;
  orden: number;
  activo: boolean;
}

export interface Alianza {
  id: string;
  clinicaId: string;
  nombre: string;
  logoUrl: string;
  linkUrl?: string;
  orden: number;
  activo: boolean;
}

export interface Testimonio {
  id: string;
  clinicaId: string;
  nombreCliente: string;
  texto: string;
  calificacion?: number;
  fotoUrl?: string;
  orden: number;
  activo: boolean;
}
