// Mirror liviano de functions/src/types/models.ts para el catálogo de
// servicios (especialidades) y profesionales que gestiona el panel admin.

export interface Especialidad {
  id: string;
  clinicaId: string;
  nombre: string;
  duracionMinutosDefault: number;
}

export interface Profesional {
  id: string;
  clinicaId: string;
  nombre: string;
  especialidadIds: string[];
}

export interface Box {
  id: string;
  clinicaId: string;
  nombre: string;
  tipo: "dental" | "medico";
}

export interface Paciente {
  id: string; // RUT, identificador principal
  clinicaId: string;
  nombre: string;
  telefono?: string;
  bloqueado: boolean;
}
