/**
 * Datos semilla para el entorno de desarrollo. SOLO corre contra el
 * Firestore emulator (nunca contra el proyecto real). Idempotente: usa IDs
 * fijos, así que se puede correr varias veces sin duplicar datos.
 *
 * Los nombres de tratamientos y montos vienen del documento real de la
 * clínica ("Plan de trabajo clinica maxilus NUEVO.txt"), no son inventados.
 *
 * Uso (con los emuladores ya corriendo, ej. `npm run emulators`):
 *   npm run seed
 */

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

const admin = require("firebase-admin");

admin.initializeApp({ projectId: "maxilus-dental" });
const db = admin.firestore();

const CLINICA_ID = "maxilus";

function hoyA(hora, minuto, offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

function haceDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

const especialidades = [
  { id: "esp-general", nombre: "Odontología general", duracionMinutosDefault: 30 },
  { id: "esp-ortodoncia", nombre: "Ortodoncia", duracionMinutosDefault: 45 },
  { id: "esp-endodoncia", nombre: "Endodoncia", duracionMinutosDefault: 60 },
  { id: "esp-implantologia", nombre: "Implantología", duracionMinutosDefault: 90 },
  { id: "esp-estetica", nombre: "Estética dental", duracionMinutosDefault: 45 },
];

const boxes = [
  { id: "box-1", nombre: "Box 1", tipo: "dental" },
  { id: "box-2", nombre: "Box 2", tipo: "dental" },
  { id: "box-3", nombre: "Box 3", tipo: "dental" },
  { id: "box-4", nombre: "Box 4", tipo: "medico" },
  { id: "box-5", nombre: "Box 5", tipo: "medico" },
];

const profesionales = [
  { id: "prof-munoz", nombre: "Dra. Muñoz", especialidadIds: ["esp-general", "esp-estetica"], comisionPorcentaje: 40 },
  { id: "prof-fuentes", nombre: "Dr. Fuentes", especialidadIds: ["esp-ortodoncia"], comisionPorcentaje: 35 },
  { id: "prof-lagos", nombre: "Dr. Lagos", especialidadIds: ["esp-endodoncia"], comisionPorcentaje: 45 },
  { id: "prof-ortiz", nombre: "Dra. Ortiz", especialidadIds: ["esp-implantologia", "esp-general"], comisionPorcentaje: 40 },
];

const pacientes = [
  { id: "11111111-1", nombre: "Josefina Rojas", telefono: "+56 9 1111 1111", bloqueado: false },
  { id: "22222222-2", nombre: "Ignacio Pardo", telefono: "+56 9 2222 2222", bloqueado: false },
  { id: "33333333-3", nombre: "Camila Soto", telefono: "+56 9 3333 3333", bloqueado: false },
  { id: "44444444-4", nombre: "Bastián Vera", telefono: "+56 9 4444 4444", bloqueado: false },
  { id: "55555555-5", nombre: "Antonia Reyes", telefono: "+56 9 5555 5555", bloqueado: false },
  { id: "66666666-6", nombre: "Matías Cerda", telefono: "+56 9 6666 6666", bloqueado: false },
];

const citas = [
  {
    id: "cita-seed-1",
    pacienteId: "11111111-1",
    profesionalId: "prof-munoz",
    boxId: "box-1",
    especialidadId: "esp-general",
    inicio: hoyA(9, 0),
    duracionMinutos: 30,
    estado: "confirmada",
    esSobrecupo: false,
  },
  {
    id: "cita-seed-2",
    pacienteId: "22222222-2",
    profesionalId: "prof-fuentes",
    boxId: "box-2",
    especialidadId: "esp-ortodoncia",
    inicio: hoyA(10, 30),
    duracionMinutos: 45,
    estado: "reservada",
    esSobrecupo: false,
  },
  {
    id: "cita-seed-3",
    pacienteId: "33333333-3",
    profesionalId: "prof-munoz",
    boxId: "box-1",
    especialidadId: "esp-general",
    inicio: hoyA(11, 15),
    duracionMinutos: 30,
    estado: "confirmada",
    esSobrecupo: false,
  },
  {
    id: "cita-seed-4",
    pacienteId: "44444444-4",
    profesionalId: "prof-lagos",
    boxId: "box-3",
    especialidadId: "esp-endodoncia",
    inicio: hoyA(12, 0),
    duracionMinutos: 60,
    estado: "cancelada",
    esSobrecupo: false,
  },
];

// Montos y tratamientos tomados de la lista real de precios de la clínica.
const presupuestos = [
  {
    id: "presupuesto-1",
    pacienteId: "11111111-1",
    profesionalId: "prof-lagos",
    especialidadId: "esp-endodoncia",
    tratamiento: "Endodoncia",
    monto: 180000,
    estado: "aceptado",
    emision: haceDias(20),
  },
  {
    id: "presupuesto-2",
    pacienteId: "22222222-2",
    profesionalId: "prof-munoz",
    especialidadId: "esp-estetica",
    tratamiento: "Blanqueamiento dental",
    monto: 150000,
    estado: "pendiente",
    emision: haceDias(5),
  },
  {
    id: "presupuesto-3",
    pacienteId: "33333333-3",
    profesionalId: "prof-fuentes",
    especialidadId: "esp-ortodoncia",
    tratamiento: "Ortodoncia (plan anual)",
    monto: 1200000,
    estado: "pendiente",
    emision: haceDias(35),
  },
  {
    id: "presupuesto-4",
    pacienteId: "55555555-5",
    profesionalId: "prof-ortiz",
    especialidadId: "esp-implantologia",
    tratamiento: "Implante dental unitario",
    monto: 600000,
    estado: "rechazado",
    emision: haceDias(15),
  },
  {
    id: "presupuesto-5",
    pacienteId: "44444444-4",
    profesionalId: "prof-munoz",
    especialidadId: "esp-general",
    tratamiento: "Exodoncia (extracción)",
    monto: 60000,
    estado: "aceptado",
    emision: haceDias(10),
  },
];

const caja = [
  {
    id: "caja-1",
    fecha: haceDias(2),
    concepto: "Abono endodoncia — Josefina Rojas",
    tipo: "ingreso",
    monto: 90000,
    metodo: "Transferencia",
    pacienteId: "11111111-1",
    presupuestoId: "presupuesto-1",
    profesionalId: "prof-lagos",
  },
  {
    id: "caja-2",
    fecha: haceDias(1),
    concepto: "Consulta control — Antonia Reyes",
    tipo: "ingreso",
    monto: 25000,
    metodo: "Débito",
    pacienteId: "55555555-5",
  },
  {
    id: "caja-3",
    fecha: haceDias(3),
    concepto: "Compra insumos clínicos",
    tipo: "egreso",
    monto: 120000,
    metodo: "Transferencia",
  },
  {
    id: "caja-4",
    fecha: hoyA(9, 30),
    concepto: "Pago total exodoncia — Bastián Vera",
    tipo: "ingreso",
    monto: 60000,
    metodo: "Efectivo",
    pacienteId: "44444444-4",
    presupuestoId: "presupuesto-5",
    profesionalId: "prof-munoz",
  },
  {
    id: "caja-5",
    fecha: haceDias(4),
    concepto: "Mantención equipo rayos X",
    tipo: "egreso",
    monto: 45000,
    metodo: "Transferencia",
  },
];

async function main() {
  const batch = db.batch();

  batch.set(db.collection("clinicas").doc(CLINICA_ID), { id: CLINICA_ID, nombre: "Maxilus SPA" });

  for (const e of especialidades) {
    batch.set(db.collection("especialidades").doc(e.id), { clinicaId: CLINICA_ID, nombre: e.nombre, duracionMinutosDefault: e.duracionMinutosDefault });
  }

  for (const b of boxes) {
    batch.set(db.collection("boxes").doc(b.id), { clinicaId: CLINICA_ID, nombre: b.nombre, tipo: b.tipo });
  }

  for (const p of profesionales) {
    batch.set(db.collection("profesionales").doc(p.id), { clinicaId: CLINICA_ID, nombre: p.nombre, especialidadIds: p.especialidadIds, comisionPorcentaje: p.comisionPorcentaje });
  }

  for (const p of pacientes) {
    batch.set(db.collection("pacientes").doc(p.id), { clinicaId: CLINICA_ID, nombre: p.nombre, telefono: p.telefono, bloqueado: p.bloqueado });
  }

  for (const c of citas) {
    const { id, ...datos } = c;
    batch.set(db.collection("citas").doc(id), { clinicaId: CLINICA_ID, ...datos });
  }

  for (const p of presupuestos) {
    const { id, ...datos } = p;
    batch.set(db.collection("presupuestos").doc(id), { clinicaId: CLINICA_ID, ...datos });
  }

  for (const m of caja) {
    const { id, ...datos } = m;
    batch.set(db.collection("caja").doc(id), { clinicaId: CLINICA_ID, ...datos });
  }

  await batch.commit();

  console.log(
    `Listo: sembrados ${especialidades.length} especialidades, ${boxes.length} boxes, ` +
      `${profesionales.length} profesionales, ${pacientes.length} pacientes, ${citas.length} citas, ` +
      `${presupuestos.length} presupuestos y ${caja.length} movimientos de caja en clinicaId "${CLINICA_ID}".`
  );
  console.log(`Firestore emulator usado: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
