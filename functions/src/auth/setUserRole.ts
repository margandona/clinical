import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import "../config/firebase-admin";
import { COLLECTIONS } from "../config/collections";
import type { Rol, UsuarioRol } from "../types/models";

const ROLES_VALIDOS: Rol[] = ["admin", "secretaria", "dentista", "paciente"];

interface SetUserRoleRequest {
  uid?: string; // usuario existente al que se le reasigna el rol
  email?: string; // junto con password: crea un usuario nuevo
  password?: string;
  rol: Rol;
  clinicaId: string;
  profesionalId?: string;
  pacienteId?: string;
}

// Callable restringida a admin: crea el usuario si no existe (o reutiliza
// uno existente vía uid), asigna rol via custom claims de Auth (fuente de
// verdad para las reglas de Firestore/Storage) y espeja el dato en
// usuarios/{uid} para poder listar/buscar usuarios desde el panel admin
// sin depender de la Admin SDK en el cliente.
export const setUserRole = onCall<SetUserRoleRequest>(async (request) => {
  const callerRol = request.auth?.token?.rol;
  if (!request.auth || callerRol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un admin puede asignar roles.");
  }

  const { uid: uidInput, email, password, rol, clinicaId, profesionalId, pacienteId } = request.data;

  if (!clinicaId || !ROLES_VALIDOS.includes(rol)) {
    throw new HttpsError(
      "invalid-argument",
      "clinicaId es obligatorio; rol debe ser admin, secretaria, dentista o paciente."
    );
  }
  if (!uidInput && (!email || !password)) {
    throw new HttpsError(
      "invalid-argument",
      "Indica un uid (usuario existente) o email y password (usuario nuevo)."
    );
  }

  const uid = uidInput ?? (await getAuth().createUser({ email, password })).uid;

  await getAuth().setCustomUserClaims(uid, {
    rol,
    clinicaId,
    ...(profesionalId ? { profesionalId } : {}),
    ...(pacienteId ? { pacienteId } : {}),
  });

  const targetUser = await getAuth().getUser(uid);
  const usuario: UsuarioRol = {
    uid,
    clinicaId,
    rol,
    email: targetUser.email ?? "",
    ...(profesionalId ? { profesionalId } : {}),
    ...(pacienteId ? { pacienteId } : {}),
  };

  await getFirestore().collection(COLLECTIONS.usuarios).doc(uid).set(usuario, { merge: true });

  return { ok: true, uid };
});
