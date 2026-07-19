// Mirror liviano de functions/src/types/models.ts para el contenido de
// marketing de la home pública (banners, destacados, alianzas, testimonios).

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
