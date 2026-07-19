# Maxilus Dental - Clinical

Sistema de gestión para clínicas dentales.

Ver planificación completa en [`../Contexto`](../Contexto/00-indice.md).

## Stack

- **Frontend:** Vue 3 + Vite + TypeScript (SPA), Vue Router, Pinia — `client/`
- **Backend:** Firebase Cloud Functions (TypeScript) — `functions/`
- **Datos:** Firestore, Firebase Auth, Storage
- **Proyecto Firebase:** `maxilus-dental`

> Nota: el frontend se migró de Next.js/React a Vue 3. No usar React, Next.js
> ni ninguna convención asociada (JSX/TSX, hooks, Context API, `next/*`) en
> ningún documento ni código nuevo del proyecto.

## Requisitos

- Node.js >= 20
- Firebase CLI (`npm install -g firebase-tools`)

## Desarrollo local (sin costo)

Por ahora todo el trabajo se hace contra el **Firebase Emulator Suite**
(Firestore, Auth, Functions, Storage corren localmente y no tocan el
proyecto real ni generan costos). El despliegue a Cloud Functions/Hosting
reales queda para más adelante.

1. Instalar dependencias:

   ```bash
   npm install
   npm install --workspace=client
   npm install --workspace=functions
   ```

2. Copiar variables de entorno del cliente:

   ```bash
   cp client/.env.local.example client/.env.local
   ```

   Completar `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_MESSAGING_SENDER_ID`
   y `VITE_FIREBASE_APP_ID` con los valores de la app web del proyecto
   `maxilus-dental` en Firebase Console. Dejar `VITE_USE_FIREBASE_EMULATORS=true`.

3. Levantar los emuladores (Firestore, Auth, Functions, Storage):

   ```bash
   npm run emulators
   ```

   UI de emuladores: http://127.0.0.1:4000

4. Crear el primer usuario admin (solo contra el emulador; resuelve el
   huevo-gallina para poder usar `setUserRole` después):

   ```bash
   cd functions
   npm run bootstrap:admin -- admin@maxilus.local Admin123!
   ```

5. (Opcional) Poblar el emulador con datos de ejemplo — especialidades,
   boxes, profesionales, pacientes, citas, presupuestos y caja (montos y
   tratamientos tomados del listado real de precios de la clínica):

   ```bash
   npm run seed
   ```

   Es idempotente (usa IDs fijos): correrlo varias veces no duplica datos.

6. En otra terminal, levantar el frontend:

   ```bash
   npm run dev
   ```

   App: http://localhost:3000 — login en `/login` con las credenciales del
   paso 4, luego `/dashboard` muestra el rol y la clínica leídos del token.

## Modelo de datos y roles (E11)

- Tipos y nombres de colección: `functions/src/types/models.ts` y
  `functions/src/config/collections.ts`. Todas las colecciones principales
  llevan `clinicaId` desde el diseño (preparado para multi-clínica sin
  activarlo en el MVP — ver `Contexto/03-preguntas-abiertas.md`, punto ⭐10).
- Roles (`admin`, `secretaria`, `dentista`, `paciente`) se asignan como
  **custom claims** de Firebase Auth vía la Cloud Function `setUserRole`
  (`functions/src/auth/setUserRole.ts`, solo invocable por un admin), y se
  espejan en `usuarios/{uid}` en Firestore.
- `firestore.rules` sigue en deny-all para todo lo demás: cada colección de
  negocio (pacientes, citas, presupuestos...) define sus reglas cuando se
  construye su épica correspondiente.

## Estructura

```
client/       Vue 3 + Vite + TypeScript (frontend, SPA)
functions/    Cloud Functions + TypeScript (backend, corre via emulador)
firebase.json, .firebaserc, firestore.rules, storage.rules   Config de Firebase
```

El archivo de credenciales `maxilus-dental-firebase-adminsdk-fbsvc-*.json`
(service account) está en la raíz del repo pero **ignorado por git** — solo
se usa si se corren scripts contra el proyecto real fuera del emulador.
