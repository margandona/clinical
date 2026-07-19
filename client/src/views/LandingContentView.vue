<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Alianza, Banner, Destacado, Testimonio } from "@/types/landing";

const auth = useAuthStore();

async function subirImagen(clinicaId: string, coleccion: string, docId: string, archivo: File): Promise<string> {
  const path = `landing/${clinicaId}/${coleccion}/${docId}-${archivo.name}`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, archivo);
  return getDownloadURL(fileRef);
}

async function borrarImagen(url: string) {
  if (!url) return;
  try {
    await deleteObject(storageRef(storage, url));
  } catch {
    // La imagen ya no existe o no se pudo borrar; no bloquea la operación.
  }
}

// --- Banners ---
const banners = ref<Banner[]>([]);
let unsubBanners: (() => void) | undefined;

const editandoBannerId = ref<string | null>(null);
const bannerTitulo = ref("");
const bannerLinkUrl = ref("");
const bannerOrden = ref(1);
const bannerActivo = ref(true);
const bannerArchivo = ref<File | null>(null);
const bannerPreview = ref("");
const guardandoBanner = ref(false);
const errorBanner = ref("");

function onBannerArchivoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  bannerArchivo.value = file;
  bannerPreview.value = file
    ? URL.createObjectURL(file)
    : (banners.value.find((b) => b.id === editandoBannerId.value)?.imagenUrl ?? "");
}

function limpiarFormBanner() {
  editandoBannerId.value = null;
  bannerTitulo.value = "";
  bannerLinkUrl.value = "";
  bannerOrden.value = banners.value.length + 1;
  bannerActivo.value = true;
  bannerArchivo.value = null;
  bannerPreview.value = "";
  errorBanner.value = "";
}

function editarBanner(banner: Banner) {
  editandoBannerId.value = banner.id;
  bannerTitulo.value = banner.titulo;
  bannerLinkUrl.value = banner.linkUrl ?? "";
  bannerOrden.value = banner.orden;
  bannerActivo.value = banner.activo;
  bannerArchivo.value = null;
  bannerPreview.value = banner.imagenUrl;
  errorBanner.value = "";
}

async function guardarBanner() {
  const clinicaId = auth.clinicaId;
  const titulo = bannerTitulo.value.trim();
  errorBanner.value = "";
  if (!clinicaId) return;
  if (!titulo) {
    errorBanner.value = "El título es obligatorio.";
    return;
  }
  if (!editandoBannerId.value && !bannerArchivo.value) {
    errorBanner.value = "La imagen es obligatoria.";
    return;
  }

  guardandoBanner.value = true;
  try {
    const actual = banners.value.find((b) => b.id === editandoBannerId.value);
    const bannerId = editandoBannerId.value ?? doc(collection(db, "banners")).id;
    let imagenUrl = actual?.imagenUrl ?? "";

    if (bannerArchivo.value) {
      if (imagenUrl) await borrarImagen(imagenUrl);
      imagenUrl = await subirImagen(clinicaId, "banners", bannerId, bannerArchivo.value);
    }

    await setDoc(doc(db, "banners", bannerId), {
      clinicaId,
      titulo,
      imagenUrl,
      linkUrl: bannerLinkUrl.value.trim(),
      orden: bannerOrden.value,
      activo: bannerActivo.value,
    });
    limpiarFormBanner();
  } catch (e) {
    errorBanner.value = "No se pudo guardar el banner. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardandoBanner.value = false;
  }
}

async function eliminarBanner(banner: Banner) {
  if (!confirm(`¿Eliminar el banner "${banner.titulo}"?`)) return;
  await deleteDoc(doc(db, "banners", banner.id));
  await borrarImagen(banner.imagenUrl);
  if (editandoBannerId.value === banner.id) limpiarFormBanner();
}

// --- Destacados ---
const destacados = ref<Destacado[]>([]);
let unsubDestacados: (() => void) | undefined;

const editandoDestacadoId = ref<string | null>(null);
const destacadoNombre = ref("");
const destacadoDescripcion = ref("");
const destacadoOrden = ref(1);
const destacadoActivo = ref(true);
const destacadoArchivo = ref<File | null>(null);
const destacadoPreview = ref("");
const guardandoDestacado = ref(false);
const errorDestacado = ref("");

function onDestacadoArchivoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  destacadoArchivo.value = file;
  destacadoPreview.value = file
    ? URL.createObjectURL(file)
    : (destacados.value.find((d) => d.id === editandoDestacadoId.value)?.imagenUrl ?? "");
}

function limpiarFormDestacado() {
  editandoDestacadoId.value = null;
  destacadoNombre.value = "";
  destacadoDescripcion.value = "";
  destacadoOrden.value = destacados.value.length + 1;
  destacadoActivo.value = true;
  destacadoArchivo.value = null;
  destacadoPreview.value = "";
  errorDestacado.value = "";
}

function editarDestacado(destacado: Destacado) {
  editandoDestacadoId.value = destacado.id;
  destacadoNombre.value = destacado.nombre;
  destacadoDescripcion.value = destacado.descripcion ?? "";
  destacadoOrden.value = destacado.orden;
  destacadoActivo.value = destacado.activo;
  destacadoArchivo.value = null;
  destacadoPreview.value = destacado.imagenUrl;
  errorDestacado.value = "";
}

async function guardarDestacado() {
  const clinicaId = auth.clinicaId;
  const nombre = destacadoNombre.value.trim();
  errorDestacado.value = "";
  if (!clinicaId) return;
  if (!nombre) {
    errorDestacado.value = "El nombre es obligatorio.";
    return;
  }
  if (!editandoDestacadoId.value && !destacadoArchivo.value) {
    errorDestacado.value = "La imagen es obligatoria.";
    return;
  }

  guardandoDestacado.value = true;
  try {
    const actual = destacados.value.find((d) => d.id === editandoDestacadoId.value);
    const destacadoId = editandoDestacadoId.value ?? doc(collection(db, "destacados")).id;
    let imagenUrl = actual?.imagenUrl ?? "";

    if (destacadoArchivo.value) {
      if (imagenUrl) await borrarImagen(imagenUrl);
      imagenUrl = await subirImagen(clinicaId, "destacados", destacadoId, destacadoArchivo.value);
    }

    await setDoc(doc(db, "destacados", destacadoId), {
      clinicaId,
      nombre,
      descripcion: destacadoDescripcion.value.trim(),
      imagenUrl,
      orden: destacadoOrden.value,
      activo: destacadoActivo.value,
    });
    limpiarFormDestacado();
  } catch (e) {
    errorDestacado.value = "No se pudo guardar el destacado. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardandoDestacado.value = false;
  }
}

async function eliminarDestacado(destacado: Destacado) {
  if (!confirm(`¿Eliminar el destacado "${destacado.nombre}"?`)) return;
  await deleteDoc(doc(db, "destacados", destacado.id));
  await borrarImagen(destacado.imagenUrl);
  if (editandoDestacadoId.value === destacado.id) limpiarFormDestacado();
}

// --- Alianzas ---
const alianzas = ref<Alianza[]>([]);
let unsubAlianzas: (() => void) | undefined;

const editandoAlianzaId = ref<string | null>(null);
const alianzaNombre = ref("");
const alianzaLinkUrl = ref("");
const alianzaOrden = ref(1);
const alianzaActivo = ref(true);
const alianzaArchivo = ref<File | null>(null);
const alianzaPreview = ref("");
const guardandoAlianza = ref(false);
const errorAlianza = ref("");

function onAlianzaArchivoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  alianzaArchivo.value = file;
  alianzaPreview.value = file
    ? URL.createObjectURL(file)
    : (alianzas.value.find((a) => a.id === editandoAlianzaId.value)?.logoUrl ?? "");
}

function limpiarFormAlianza() {
  editandoAlianzaId.value = null;
  alianzaNombre.value = "";
  alianzaLinkUrl.value = "";
  alianzaOrden.value = alianzas.value.length + 1;
  alianzaActivo.value = true;
  alianzaArchivo.value = null;
  alianzaPreview.value = "";
  errorAlianza.value = "";
}

function editarAlianza(alianza: Alianza) {
  editandoAlianzaId.value = alianza.id;
  alianzaNombre.value = alianza.nombre;
  alianzaLinkUrl.value = alianza.linkUrl ?? "";
  alianzaOrden.value = alianza.orden;
  alianzaActivo.value = alianza.activo;
  alianzaArchivo.value = null;
  alianzaPreview.value = alianza.logoUrl;
  errorAlianza.value = "";
}

async function guardarAlianza() {
  const clinicaId = auth.clinicaId;
  const nombre = alianzaNombre.value.trim();
  errorAlianza.value = "";
  if (!clinicaId) return;
  if (!nombre) {
    errorAlianza.value = "El nombre es obligatorio.";
    return;
  }
  if (!editandoAlianzaId.value && !alianzaArchivo.value) {
    errorAlianza.value = "El logo es obligatorio.";
    return;
  }

  guardandoAlianza.value = true;
  try {
    const actual = alianzas.value.find((a) => a.id === editandoAlianzaId.value);
    const alianzaId = editandoAlianzaId.value ?? doc(collection(db, "alianzas")).id;
    let logoUrl = actual?.logoUrl ?? "";

    if (alianzaArchivo.value) {
      if (logoUrl) await borrarImagen(logoUrl);
      logoUrl = await subirImagen(clinicaId, "alianzas", alianzaId, alianzaArchivo.value);
    }

    await setDoc(doc(db, "alianzas", alianzaId), {
      clinicaId,
      nombre,
      logoUrl,
      linkUrl: alianzaLinkUrl.value.trim(),
      orden: alianzaOrden.value,
      activo: alianzaActivo.value,
    });
    limpiarFormAlianza();
  } catch (e) {
    errorAlianza.value = "No se pudo guardar la alianza. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardandoAlianza.value = false;
  }
}

async function eliminarAlianza(alianza: Alianza) {
  if (!confirm(`¿Eliminar la alianza "${alianza.nombre}"?`)) return;
  await deleteDoc(doc(db, "alianzas", alianza.id));
  await borrarImagen(alianza.logoUrl);
  if (editandoAlianzaId.value === alianza.id) limpiarFormAlianza();
}

// --- Testimonios ---
const testimonios = ref<Testimonio[]>([]);
let unsubTestimonios: (() => void) | undefined;

const editandoTestimonioId = ref<string | null>(null);
const testimonioNombreCliente = ref("");
const testimonioTexto = ref("");
const testimonioCalificacion = ref(5);
const testimonioOrden = ref(1);
const testimonioActivo = ref(true);
const testimonioArchivo = ref<File | null>(null);
const testimonioPreview = ref("");
const guardandoTestimonio = ref(false);
const errorTestimonio = ref("");

function onTestimonioArchivoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  testimonioArchivo.value = file;
  testimonioPreview.value = file
    ? URL.createObjectURL(file)
    : (testimonios.value.find((t) => t.id === editandoTestimonioId.value)?.fotoUrl ?? "");
}

function limpiarFormTestimonio() {
  editandoTestimonioId.value = null;
  testimonioNombreCliente.value = "";
  testimonioTexto.value = "";
  testimonioCalificacion.value = 5;
  testimonioOrden.value = testimonios.value.length + 1;
  testimonioActivo.value = true;
  testimonioArchivo.value = null;
  testimonioPreview.value = "";
  errorTestimonio.value = "";
}

function editarTestimonio(testimonio: Testimonio) {
  editandoTestimonioId.value = testimonio.id;
  testimonioNombreCliente.value = testimonio.nombreCliente;
  testimonioTexto.value = testimonio.texto;
  testimonioCalificacion.value = testimonio.calificacion ?? 5;
  testimonioOrden.value = testimonio.orden;
  testimonioActivo.value = testimonio.activo;
  testimonioArchivo.value = null;
  testimonioPreview.value = testimonio.fotoUrl ?? "";
  errorTestimonio.value = "";
}

async function guardarTestimonio() {
  const clinicaId = auth.clinicaId;
  const nombreCliente = testimonioNombreCliente.value.trim();
  const texto = testimonioTexto.value.trim();
  errorTestimonio.value = "";
  if (!clinicaId) return;
  if (!nombreCliente || !texto) {
    errorTestimonio.value = "El nombre del cliente y el texto son obligatorios.";
    return;
  }

  guardandoTestimonio.value = true;
  try {
    const actual = testimonios.value.find((t) => t.id === editandoTestimonioId.value);
    const testimonioId = editandoTestimonioId.value ?? doc(collection(db, "testimonios")).id;
    let fotoUrl = actual?.fotoUrl ?? "";

    if (testimonioArchivo.value) {
      if (fotoUrl) await borrarImagen(fotoUrl);
      fotoUrl = await subirImagen(clinicaId, "testimonios", testimonioId, testimonioArchivo.value);
    }

    await setDoc(doc(db, "testimonios", testimonioId), {
      clinicaId,
      nombreCliente,
      texto,
      calificacion: testimonioCalificacion.value,
      fotoUrl,
      orden: testimonioOrden.value,
      activo: testimonioActivo.value,
    });
    limpiarFormTestimonio();
  } catch (e) {
    errorTestimonio.value = "No se pudo guardar el testimonio. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardandoTestimonio.value = false;
  }
}

async function eliminarTestimonio(testimonio: Testimonio) {
  if (!confirm(`¿Eliminar el testimonio de "${testimonio.nombreCliente}"?`)) return;
  await deleteDoc(doc(db, "testimonios", testimonio.id));
  if (testimonio.fotoUrl) await borrarImagen(testimonio.fotoUrl);
  if (editandoTestimonioId.value === testimonio.id) limpiarFormTestimonio();
}

onMounted(() => {
  const clinicaId = auth.clinicaId;
  if (!clinicaId) return;

  unsubBanners = onSnapshot(query(collection(db, "banners"), where("clinicaId", "==", clinicaId)), (snap) => {
    banners.value = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Banner, "id">) }))
      .sort((a, b) => a.orden - b.orden);
  });

  unsubDestacados = onSnapshot(query(collection(db, "destacados"), where("clinicaId", "==", clinicaId)), (snap) => {
    destacados.value = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Destacado, "id">) }))
      .sort((a, b) => a.orden - b.orden);
  });

  unsubAlianzas = onSnapshot(query(collection(db, "alianzas"), where("clinicaId", "==", clinicaId)), (snap) => {
    alianzas.value = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Alianza, "id">) }))
      .sort((a, b) => a.orden - b.orden);
  });

  unsubTestimonios = onSnapshot(query(collection(db, "testimonios"), where("clinicaId", "==", clinicaId)), (snap) => {
    testimonios.value = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Testimonio, "id">) }))
      .sort((a, b) => a.orden - b.orden);
  });
});

onUnmounted(() => {
  unsubBanners?.();
  unsubDestacados?.();
  unsubAlianzas?.();
  unsubTestimonios?.();
});
</script>

<template>
  <main>
    <h1>Contenido de la landing</h1>
    <p class="mock-note">🖼️ Estas 4 secciones se muestran en la página de inicio pública (/). Un item inactivo no se ve en la landing pero no se pierde.</p>

    <!-- Banners -->
    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>{{ editandoBannerId ? "Editar banner" : "Nuevo banner" }}</h2>
      </div>
      <form @submit.prevent="guardarBanner">
        <div class="field">
          <label for="banner-titulo">Título</label>
          <input id="banner-titulo" v-model="bannerTitulo" type="text" placeholder="Ej: 20% dcto en blanqueamiento" required />
        </div>
        <div class="field">
          <label for="banner-link">Link (opcional)</label>
          <input id="banner-link" v-model="bannerLinkUrl" type="text" placeholder="https://..." />
        </div>
        <div class="field">
          <label for="banner-imagen">Imagen</label>
          <input id="banner-imagen" type="file" accept="image/*" @change="onBannerArchivoChange" />
          <img v-if="bannerPreview" :src="bannerPreview" alt="" class="preview-thumb" />
        </div>
        <div style="display: flex; gap: 1.5rem; align-items: flex-end">
          <div class="field" style="max-width: 140px">
            <label for="banner-orden">Orden</label>
            <input id="banner-orden" v-model.number="bannerOrden" type="number" min="1" required />
          </div>
          <label class="check-field"><input v-model="bannerActivo" type="checkbox" /> Activo</label>
        </div>
        <p v-if="errorBanner" class="badge badge--critical" style="margin-bottom: 1rem">{{ errorBanner }}</p>
        <div style="display: flex; gap: 0.6rem">
          <button type="submit" class="btn btn-primary" :disabled="guardandoBanner">
            {{ editandoBannerId ? "Guardar cambios" : "Crear banner" }}
          </button>
          <button v-if="editandoBannerId" type="button" class="btn btn-secondary" @click="limpiarFormBanner">Cancelar</button>
        </div>
      </form>

      <div class="table-wrap" style="margin-top: 1.25rem">
        <table class="data-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Título</th>
              <th>Orden</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in banners" :key="b.id">
              <td><img :src="b.imagenUrl" alt="" class="table-thumb" /></td>
              <td>{{ b.titulo }}</td>
              <td>{{ b.orden }}</td>
              <td>
                <span class="badge" :class="b.activo ? 'badge--good' : 'badge--serious'">{{ b.activo ? "Activo" : "Inactivo" }}</span>
              </td>
              <td style="display: flex; gap: 0.5rem">
                <button type="button" class="btn btn-secondary" @click="editarBanner(b)">Editar</button>
                <button type="button" class="btn btn-secondary" @click="eliminarBanner(b)">Eliminar</button>
              </td>
            </tr>
            <tr v-if="banners.length === 0">
              <td colspan="5">Aún no hay banners creados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Destacados -->
    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>{{ editandoDestacadoId ? "Editar destacado" : "Nuevo destacado" }}</h2>
      </div>
      <form @submit.prevent="guardarDestacado">
        <div class="field">
          <label for="destacado-nombre">Nombre</label>
          <input id="destacado-nombre" v-model="destacadoNombre" type="text" placeholder="Ej: Limpieza dental" required />
        </div>
        <div class="field">
          <label for="destacado-descripcion">Descripción (opcional)</label>
          <input id="destacado-descripcion" v-model="destacadoDescripcion" type="text" />
        </div>
        <div class="field">
          <label for="destacado-imagen">Imagen</label>
          <input id="destacado-imagen" type="file" accept="image/*" @change="onDestacadoArchivoChange" />
          <img v-if="destacadoPreview" :src="destacadoPreview" alt="" class="preview-thumb" />
        </div>
        <div style="display: flex; gap: 1.5rem; align-items: flex-end">
          <div class="field" style="max-width: 140px">
            <label for="destacado-orden">Orden</label>
            <input id="destacado-orden" v-model.number="destacadoOrden" type="number" min="1" required />
          </div>
          <label class="check-field"><input v-model="destacadoActivo" type="checkbox" /> Activo</label>
        </div>
        <p v-if="errorDestacado" class="badge badge--critical" style="margin-bottom: 1rem">{{ errorDestacado }}</p>
        <div style="display: flex; gap: 0.6rem">
          <button type="submit" class="btn btn-primary" :disabled="guardandoDestacado">
            {{ editandoDestacadoId ? "Guardar cambios" : "Crear destacado" }}
          </button>
          <button v-if="editandoDestacadoId" type="button" class="btn btn-secondary" @click="limpiarFormDestacado">Cancelar</button>
        </div>
      </form>

      <div class="table-wrap" style="margin-top: 1.25rem">
        <table class="data-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Orden</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in destacados" :key="d.id">
              <td><img :src="d.imagenUrl" alt="" class="table-thumb" /></td>
              <td>{{ d.nombre }}</td>
              <td>{{ d.orden }}</td>
              <td>
                <span class="badge" :class="d.activo ? 'badge--good' : 'badge--serious'">{{ d.activo ? "Activo" : "Inactivo" }}</span>
              </td>
              <td style="display: flex; gap: 0.5rem">
                <button type="button" class="btn btn-secondary" @click="editarDestacado(d)">Editar</button>
                <button type="button" class="btn btn-secondary" @click="eliminarDestacado(d)">Eliminar</button>
              </td>
            </tr>
            <tr v-if="destacados.length === 0">
              <td colspan="5">Aún no hay destacados creados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Alianzas -->
    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>{{ editandoAlianzaId ? "Editar alianza" : "Nueva alianza" }}</h2>
      </div>
      <form @submit.prevent="guardarAlianza">
        <div class="field">
          <label for="alianza-nombre">Nombre</label>
          <input id="alianza-nombre" v-model="alianzaNombre" type="text" placeholder="Ej: Isapre Consalud" required />
        </div>
        <div class="field">
          <label for="alianza-link">Link (opcional)</label>
          <input id="alianza-link" v-model="alianzaLinkUrl" type="text" placeholder="https://..." />
        </div>
        <div class="field">
          <label for="alianza-logo">Logo</label>
          <input id="alianza-logo" type="file" accept="image/*" @change="onAlianzaArchivoChange" />
          <img v-if="alianzaPreview" :src="alianzaPreview" alt="" class="preview-thumb" />
        </div>
        <div style="display: flex; gap: 1.5rem; align-items: flex-end">
          <div class="field" style="max-width: 140px">
            <label for="alianza-orden">Orden</label>
            <input id="alianza-orden" v-model.number="alianzaOrden" type="number" min="1" required />
          </div>
          <label class="check-field"><input v-model="alianzaActivo" type="checkbox" /> Activo</label>
        </div>
        <p v-if="errorAlianza" class="badge badge--critical" style="margin-bottom: 1rem">{{ errorAlianza }}</p>
        <div style="display: flex; gap: 0.6rem">
          <button type="submit" class="btn btn-primary" :disabled="guardandoAlianza">
            {{ editandoAlianzaId ? "Guardar cambios" : "Crear alianza" }}
          </button>
          <button v-if="editandoAlianzaId" type="button" class="btn btn-secondary" @click="limpiarFormAlianza">Cancelar</button>
        </div>
      </form>

      <div class="table-wrap" style="margin-top: 1.25rem">
        <table class="data-table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Nombre</th>
              <th>Orden</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in alianzas" :key="a.id">
              <td><img :src="a.logoUrl" alt="" class="table-thumb" /></td>
              <td>{{ a.nombre }}</td>
              <td>{{ a.orden }}</td>
              <td>
                <span class="badge" :class="a.activo ? 'badge--good' : 'badge--serious'">{{ a.activo ? "Activo" : "Inactivo" }}</span>
              </td>
              <td style="display: flex; gap: 0.5rem">
                <button type="button" class="btn btn-secondary" @click="editarAlianza(a)">Editar</button>
                <button type="button" class="btn btn-secondary" @click="eliminarAlianza(a)">Eliminar</button>
              </td>
            </tr>
            <tr v-if="alianzas.length === 0">
              <td colspan="5">Aún no hay alianzas creadas.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Testimonios -->
    <div class="card">
      <div class="card-header">
        <h2>{{ editandoTestimonioId ? "Editar testimonio" : "Nuevo testimonio" }}</h2>
      </div>
      <form @submit.prevent="guardarTestimonio">
        <div class="field">
          <label for="testimonio-nombre">Nombre del cliente</label>
          <input id="testimonio-nombre" v-model="testimonioNombreCliente" type="text" placeholder="Ej: María P." required />
        </div>
        <div class="field">
          <label for="testimonio-texto">Testimonio</label>
          <input id="testimonio-texto" v-model="testimonioTexto" type="text" placeholder="Excelente atención..." required />
        </div>
        <div class="field">
          <label for="testimonio-foto">Foto (opcional)</label>
          <input id="testimonio-foto" type="file" accept="image/*" @change="onTestimonioArchivoChange" />
          <img v-if="testimonioPreview" :src="testimonioPreview" alt="" class="preview-thumb" />
        </div>
        <div style="display: flex; gap: 1.5rem; align-items: flex-end">
          <div class="field" style="max-width: 140px">
            <label for="testimonio-calificacion">Calificación (1-5)</label>
            <input id="testimonio-calificacion" v-model.number="testimonioCalificacion" type="number" min="1" max="5" required />
          </div>
          <div class="field" style="max-width: 140px">
            <label for="testimonio-orden">Orden</label>
            <input id="testimonio-orden" v-model.number="testimonioOrden" type="number" min="1" required />
          </div>
          <label class="check-field"><input v-model="testimonioActivo" type="checkbox" /> Activo</label>
        </div>
        <p v-if="errorTestimonio" class="badge badge--critical" style="margin-bottom: 1rem">{{ errorTestimonio }}</p>
        <div style="display: flex; gap: 0.6rem">
          <button type="submit" class="btn btn-primary" :disabled="guardandoTestimonio">
            {{ editandoTestimonioId ? "Guardar cambios" : "Crear testimonio" }}
          </button>
          <button v-if="editandoTestimonioId" type="button" class="btn btn-secondary" @click="limpiarFormTestimonio">Cancelar</button>
        </div>
      </form>

      <div class="table-wrap" style="margin-top: 1.25rem">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Texto</th>
              <th>Calificación</th>
              <th>Orden</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in testimonios" :key="t.id">
              <td>{{ t.nombreCliente }}</td>
              <td>{{ t.texto }}</td>
              <td>{{ t.calificacion ?? "—" }}</td>
              <td>{{ t.orden }}</td>
              <td>
                <span class="badge" :class="t.activo ? 'badge--good' : 'badge--serious'">{{ t.activo ? "Activo" : "Inactivo" }}</span>
              </td>
              <td style="display: flex; gap: 0.5rem">
                <button type="button" class="btn btn-secondary" @click="editarTestimonio(t)">Editar</button>
                <button type="button" class="btn btn-secondary" @click="eliminarTestimonio(t)">Eliminar</button>
              </td>
            </tr>
            <tr v-if="testimonios.length === 0">
              <td colspan="6">Aún no hay testimonios creados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<style scoped>
.check-field {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.preview-thumb {
  margin-top: 0.5rem;
  max-width: 220px;
  max-height: 120px;
  object-fit: contain;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.table-thumb {
  width: 56px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
}
</style>
