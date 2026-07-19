import type { Rol } from "@/types/auth";

export type NavIcon =
  | "dashboard"
  | "agenda"
  | "pacientes"
  | "presupuestos"
  | "caja"
  | "servicios"
  | "boxes"
  | "metricas"
  | "usuarios"
  | "landing";

export interface NavItem {
  label: string;
  to: string;
  icon: NavIcon;
  roles: Rol[];
}

export const navItems: NavItem[] = [
  {
    label: "Inicio",
    to: "/dashboard",
    icon: "dashboard",
    roles: ["admin", "secretaria", "dentista", "paciente"],
  },
  {
    label: "Agenda",
    to: "/agenda",
    icon: "agenda",
    roles: ["admin", "secretaria", "dentista", "paciente"],
  },
  {
    label: "Pacientes",
    to: "/pacientes",
    icon: "pacientes",
    roles: ["admin", "secretaria", "dentista"],
  },
  {
    label: "Presupuestos",
    to: "/presupuestos",
    icon: "presupuestos",
    roles: ["admin", "secretaria", "dentista", "paciente"],
  },
  { label: "Caja", to: "/caja", icon: "caja", roles: ["admin", "secretaria"] },
  { label: "Servicios", to: "/admin/servicios", icon: "servicios", roles: ["admin"] },
  { label: "Boxes", to: "/admin/boxes", icon: "boxes", roles: ["admin"] },
  { label: "Usuarios", to: "/admin/usuarios", icon: "usuarios", roles: ["admin"] },
  { label: "Panel admin", to: "/admin/metricas", icon: "metricas", roles: ["admin"] },
  { label: "Contenido landing", to: "/admin/landing", icon: "landing", roles: ["admin"] },
];
