import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import "../config/firebase-admin";
import { COLLECTIONS } from "../config/collections";
import { normalizarRut } from "./rut";
import type { UsuarioRol } from "../types/models";

interface IniciarSesionConRutRequest {
  rut: string;
  clave: string;
}

const CREDENCIALES_INVALIDAS = "RUT o clave incorrectos.";

// Simulación de "Clave Única": el cliente solo maneja RUT + clave, nunca el
// email real detrás de la cuenta. Esta función resuelve el RUT a un usuario
// (Admin SDK, sin pasar por las reglas de Firestore), verifica la clave
// contra el endpoint REST de Identity Platform (Admin SDK no puede validar
// contraseñas) y devuelve un customToken para que el cliente complete el
// login con signInWithCustomToken. Mismo error genérico si el RUT no existe
// o si la clave es incorrecta, para no revelar qué RUTs están registrados.
export const iniciarSesionConRut = onCall<IniciarSesionConRutRequest>(async (request) => {
  const rut = request.data?.rut ? normalizarRut(request.data.rut) : "";
  const clave = request.data?.clave ?? "";

  if (!rut || !clave) {
    throw new HttpsError("invalid-argument", CREDENCIALES_INVALIDAS);
  }

  const snap = await getFirestore().collection(COLLECTIONS.usuarios).where("rut", "==", rut).limit(1).get();

  if (snap.empty) {
    throw new HttpsError("invalid-argument", CREDENCIALES_INVALIDAS);
  }

  const usuario = snap.docs[0].data() as UsuarioRol;

  const apiKey = process.env.FIREBASE_WEB_API_KEY ?? "fake-api-key";
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const signInUrl = authEmulatorHost
    ? `http://${authEmulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`
    : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

  const signInRes = await fetch(signInUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: usuario.email, password: clave, returnSecureToken: true }),
  });

  if (!signInRes.ok) {
    throw new HttpsError("invalid-argument", CREDENCIALES_INVALIDAS);
  }

  const customToken = await getAuth().createCustomToken(usuario.uid);
  return { customToken };
});
