/**
 * Bootstrap del primer usuario admin. SOLO corre contra el Auth/Firestore
 * emulator (nunca contra el proyecto real) resolviendo el problema de
 * huevo-gallina para poder usar la Cloud Function `setUserRole` despues.
 *
 * Uso (con los emuladores ya corriendo, ej. `npm run emulators`):
 *   npm run bootstrap:admin -- admin@maxilus.local Admin123!
 */

// Apunta al emulador local salvo que el caller override explicitamente
// (ej. para usar otro puerto). Nunca apunta a Firebase real por defecto.
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

const admin = require("firebase-admin");

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Uso: npm run bootstrap:admin -- <email> <password>");
  process.exit(1);
}

admin.initializeApp({ projectId: "maxilus-dental" });

async function main() {
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (err) {
    user = await admin.auth().createUser({ email, password });
  }

  await admin.auth().setCustomUserClaims(user.uid, {
    rol: "admin",
    clinicaId: "maxilus",
  });

  await admin
    .firestore()
    .collection("usuarios")
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        clinicaId: "maxilus",
        rol: "admin",
        email,
      },
      { merge: true }
    );

  console.log(`Listo: ${email} (uid ${user.uid}) es admin de clinicaId "maxilus".`);
  console.log(`Emuladores usados: Auth=${process.env.FIREBASE_AUTH_EMULATOR_HOST} Firestore=${process.env.FIRESTORE_EMULATOR_HOST}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
