// Mirror liviano de functions/src/types/models.ts para lo que
// necesita el cliente (auth y roles). El modelo completo de datos
// clínicos vive en functions/src/types/models.ts.

export type Rol = "admin" | "secretaria" | "dentista" | "paciente";

export interface UsuarioRol {
  uid: string;
  clinicaId: string;
  rol: Rol;
  email: string;
  profesionalId?: string;
  pacienteId?: string;
}
