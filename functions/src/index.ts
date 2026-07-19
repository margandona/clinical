import { onRequest } from "firebase-functions/v2/https";
import "./config/firebase-admin";

export const health = onRequest((req, res) => {
  res.json({ status: "ok" });
});

export { setUserRole } from "./auth/setUserRole";
export { iniciarSesionConRut } from "./auth/iniciarSesionConRut";
export { obtenerComisionDentista } from "./finanzas/obtenerComisionDentista";
