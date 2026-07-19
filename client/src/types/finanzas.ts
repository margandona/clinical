// Mirror liviano de functions/src/types/models.ts para Presupuestos y Caja.

import type { Timestamp } from "firebase/firestore";

export type EstadoPresupuesto = "pendiente" | "aceptado" | "rechazado";

export interface Presupuesto {
  id: string;
  clinicaId: string;
  pacienteId: string;
  profesionalId: string;
  especialidadId?: string;
  tratamiento: string;
  monto: number;
  estado: EstadoPresupuesto;
  emision: Timestamp;
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
  presupuestoId?: string;
  profesionalId?: string;
}
