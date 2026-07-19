import { createRouter, createWebHistory } from "vue-router";
import { authReady, useAuthStore } from "@/stores/auth";
import type { Rol } from "@/types/auth";

declare module "vue-router" {
  interface RouteMeta {
    blank?: boolean;
    requiresAuth?: boolean;
    roles?: Rol[];
    title?: string;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
      meta: { blank: true },
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { blank: true },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("@/views/DashboardView.vue"),
      meta: { requiresAuth: true, title: "Inicio" },
    },
    {
      path: "/agenda",
      name: "agenda",
      component: () => import("@/views/AgendaView.vue"),
      meta: { requiresAuth: true, title: "Agenda" },
    },
    {
      path: "/pacientes",
      name: "pacientes",
      component: () => import("@/views/PacientesView.vue"),
      meta: { requiresAuth: true, roles: ["admin", "secretaria", "dentista"], title: "Pacientes" },
    },
    {
      path: "/pacientes/:id",
      name: "paciente-ficha",
      component: () => import("@/views/PacienteFichaView.vue"),
      meta: { requiresAuth: true, roles: ["admin", "secretaria", "dentista"], title: "Ficha clínica" },
    },
    {
      path: "/presupuestos",
      name: "presupuestos",
      component: () => import("@/views/PresupuestosView.vue"),
      meta: { requiresAuth: true, title: "Presupuestos" },
    },
    {
      path: "/caja",
      name: "caja",
      component: () => import("@/views/CajaView.vue"),
      meta: { requiresAuth: true, roles: ["admin", "secretaria"], title: "Caja" },
    },
    {
      path: "/admin/servicios",
      name: "admin-servicios",
      component: () => import("@/views/ServiciosView.vue"),
      meta: { requiresAuth: true, roles: ["admin"], title: "Servicios" },
    },
    {
      path: "/admin/boxes",
      name: "admin-boxes",
      component: () => import("@/views/BoxesView.vue"),
      meta: { requiresAuth: true, roles: ["admin"], title: "Boxes" },
    },
    {
      path: "/admin/usuarios",
      name: "admin-usuarios",
      component: () => import("@/views/UsuariosView.vue"),
      meta: { requiresAuth: true, roles: ["admin"], title: "Usuarios" },
    },
    {
      path: "/admin/metricas",
      name: "admin-metricas",
      component: () => import("@/views/AdminMetricsView.vue"),
      meta: { requiresAuth: true, roles: ["admin"], title: "Panel admin" },
    },
    {
      path: "/admin/landing",
      name: "admin-landing",
      component: () => import("@/views/LandingContentView.vue"),
      meta: { requiresAuth: true, roles: ["admin"], title: "Contenido landing" },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/NotFoundView.vue"),
      meta: { blank: true },
    },
  ],
});

router.beforeEach(async (to) => {
  await authReady;
  const auth = useAuthStore();
  const isAuthenticated = !!auth.user;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: "login" };
  }

  if (to.name === "login" && isAuthenticated) {
    return { name: "dashboard" };
  }

  if (to.meta.roles && auth.rol && !to.meta.roles.includes(auth.rol)) {
    return { name: "dashboard" };
  }

  return true;
});

export default router;
