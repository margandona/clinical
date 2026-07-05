import { getApps, initializeApp } from "firebase-admin/app";

// Bajo el emulador (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
// definidos por `firebase emulators:start`) esto no toca el proyecto real
// ni genera costos. En produccion, initializeApp() sin argumentos usa las
// credenciales por defecto del entorno de Cloud Functions.
const app = getApps().length ? getApps()[0] : initializeApp();

export default app;
