import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import "../config/firebase-admin";
import { COLLECTIONS } from "../config/collections";

interface ObtenerComisionDentistaRequest {
  inicioMesMillis: number;
  finMesMillis: number;
}

interface MovimientoComision {
  fechaMillis: number;
  monto: number;
}

// Devuelve los datos crudos (ingresos vinculados a presupuestos de este
// dentista, dentro del rango de fechas que pida el cliente) más el % de
// comisión configurado por el admin. El cálculo de "hoy", "este mes" y el
// agrupado por día se hace en el cliente (igual que el resto de la app,
// ej. AgendaView), usando la hora local del navegador — así se evita que
// el runtime de la Cloud Function (que corre en UTC) desalinee los días
// respecto a la hora de Chile.
//
// No se abre lectura de `caja` a dentista en las reglas de Firestore: esta
// función usa el Admin SDK y solo expone los montos ya filtrados a su
// propio profesionalId, preservando "manejo de plata solo secretaria-admin"
// a nivel de colección.
export const obtenerComisionDentista = onCall<ObtenerComisionDentistaRequest>(async (request) => {
  const rol = request.auth?.token?.rol;
  const clinicaId = request.auth?.token?.clinicaId as string | undefined;
  const profesionalId = request.auth?.token?.profesionalId as string | undefined;

  if (!request.auth || rol !== "dentista" || !clinicaId || !profesionalId) {
    throw new HttpsError("permission-denied", "Solo un dentista con profesional asignado puede ver su comisión.");
  }

  const { inicioMesMillis, finMesMillis } = request.data ?? {};
  if (typeof inicioMesMillis !== "number" || typeof finMesMillis !== "number" || inicioMesMillis >= finMesMillis) {
    throw new HttpsError("invalid-argument", "inicioMesMillis y finMesMillis son obligatorios y deben formar un rango válido.");
  }

  const db = getFirestore();

  const profesionalSnap = await db.collection(COLLECTIONS.profesionales).doc(profesionalId).get();
  const comisionPorcentaje = (profesionalSnap.data()?.comisionPorcentaje as number | undefined) ?? 0;

  const movimientosSnap = await db
    .collection(COLLECTIONS.caja)
    .where("clinicaId", "==", clinicaId)
    .where("profesionalId", "==", profesionalId)
    .where("tipo", "==", "ingreso")
    .where("fecha", ">=", new Date(inicioMesMillis))
    .where("fecha", "<", new Date(finMesMillis))
    .get();

  const movimientos: MovimientoComision[] = movimientosSnap.docs.map((d) => ({
    fechaMillis: d.data().fecha.toMillis(),
    monto: d.data().monto as number,
  }));

  return { comisionPorcentaje, movimientos };
});
