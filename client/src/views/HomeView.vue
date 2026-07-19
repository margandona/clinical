<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import logo from "@/assets/logo.png";
import type { Alianza, Banner, Destacado, Testimonio } from "@/types/landing";

const especialidades = [
  {
    nombre: "Implantología",
    descripcion: "La especialidad de mayor demanda en la clínica.",
  },
  {
    nombre: "Ortodoncia",
    descripcion: "Planes y seguimiento con el Dr. Soto.",
  },
  {
    nombre: "Bruxismo / DTM",
    descripcion: "Diagnóstico y planes de relajación.",
  },
  {
    nombre: "Rehabilitación oral",
    descripcion: "Coronas, prótesis y planes integrales.",
  },
];

// Contenido de marketing editable por el admin (/admin/landing). Se lee
// una sola vez al montar (no onSnapshot: no necesita tiempo real) y cada
// sección se oculta si no tiene items activos.
const banners = ref<Banner[]>([]);
const destacados = ref<Destacado[]>([]);
const alianzas = ref<Alianza[]>([]);
const testimonios = ref<Testimonio[]>([]);

async function cargarActivos<T extends { orden: number }>(coleccion: string) {
  const snap = await getDocs(query(collection(db, coleccion), where("activo", "==", true)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<T, "id">) }) as unknown as T)
    .sort((a, b) => a.orden - b.orden);
}

const bannerIndex = ref(0);
const bannerPausado = ref(false);
let carouselTimer: ReturnType<typeof setInterval> | undefined;

onMounted(async () => {
  const [b, d, a, t] = await Promise.all([
    cargarActivos<Banner>("banners"),
    cargarActivos<Destacado>("destacados"),
    cargarActivos<Alianza>("alianzas"),
    cargarActivos<Testimonio>("testimonios"),
  ]);
  banners.value = b;
  destacados.value = d;
  alianzas.value = a;
  testimonios.value = t;

  carouselTimer = setInterval(() => {
    if (bannerPausado.value || banners.value.length < 2) return;
    bannerIndex.value = (bannerIndex.value + 1) % banners.value.length;
  }, 5000);
});

onUnmounted(() => {
  clearInterval(carouselTimer);
});
</script>

<template>
  <div class="home-page">
    <header class="home-header">
      <div class="home-brand">
        <img :src="logo" alt="Maxilus Dental" class="home-brand-logo" />
        <span class="home-brand-name">Maxilus Dental</span>
      </div>
      <router-link to="/login" class="btn btn-secondary">Iniciar sesión</router-link>
    </header>

    <section class="home-hero">
      <img :src="logo" alt="Maxilus Dental" class="home-hero-logo" />
      <span class="home-hero-badge">Ovalle, Chile</span>
      <h1 class="home-hero-title">Gestión clínica dental, sin fricción</h1>
      <p class="home-hero-subtitle">
        Agenda, pacientes, presupuestos y caja de Maxilus Centro Médico Integral en un solo lugar.
      </p>
      <router-link to="/login" class="btn btn-primary home-hero-cta">Iniciar sesión →</router-link>
    </section>

    <section
      v-if="banners.length"
      class="home-banners"
      @mouseenter="bannerPausado = true"
      @mouseleave="bannerPausado = false"
    >
      <div class="banner-viewport">
        <div class="banner-track" :style="{ transform: `translateX(-${bannerIndex * 100}%)` }">
          <component
            :is="banner.linkUrl ? 'a' : 'div'"
            v-for="banner in banners"
            :key="banner.id"
            :href="banner.linkUrl || undefined"
            :target="banner.linkUrl ? '_blank' : undefined"
            :rel="banner.linkUrl ? 'noopener noreferrer' : undefined"
            class="banner-slide"
          >
            <img :src="banner.imagenUrl" :alt="banner.titulo" />
            <span class="banner-slide-title">{{ banner.titulo }}</span>
          </component>
        </div>
      </div>
      <div v-if="banners.length > 1" class="banner-dots">
        <button
          v-for="(banner, i) in banners"
          :key="banner.id"
          type="button"
          class="banner-dot"
          :class="{ 'banner-dot--active': i === bannerIndex }"
          :aria-label="`Ir al banner ${i + 1}`"
          @click="bannerIndex = i"
        />
      </div>
    </section>

    <section v-if="destacados.length" class="home-destacados">
      <h2 class="home-specialties-title">Lo más solicitado</h2>
      <div class="home-destacados-grid">
        <div v-for="destacado in destacados" :key="destacado.id" class="home-destacado-card">
          <img :src="destacado.imagenUrl" :alt="destacado.nombre" class="home-destacado-img" />
          <div class="home-destacado-nombre">{{ destacado.nombre }}</div>
          <div v-if="destacado.descripcion" class="home-destacado-desc">{{ destacado.descripcion }}</div>
        </div>
      </div>
    </section>

    <section class="home-specialties">
      <h2 class="home-specialties-title">Especialidades más solicitadas</h2>
      <div class="home-specialties-grid">
        <div v-for="especialidad in especialidades" :key="especialidad.nombre" class="home-specialty-card">
          <div class="home-specialty-icon" />
          <div class="home-specialty-name">{{ especialidad.nombre }}</div>
          <div class="home-specialty-desc">{{ especialidad.descripcion }}</div>
        </div>
      </div>
    </section>

    <section v-if="alianzas.length" class="home-alianzas">
      <h2 class="home-specialties-title">Convenios y alianzas</h2>
      <div class="home-alianzas-strip">
        <component
          :is="alianza.linkUrl ? 'a' : 'div'"
          v-for="alianza in alianzas"
          :key="alianza.id"
          :href="alianza.linkUrl || undefined"
          :target="alianza.linkUrl ? '_blank' : undefined"
          :rel="alianza.linkUrl ? 'noopener noreferrer' : undefined"
          class="alianza-logo"
        >
          <img :src="alianza.logoUrl" :alt="alianza.nombre" />
        </component>
      </div>
    </section>

    <section v-if="testimonios.length" class="home-testimonios">
      <h2 class="home-specialties-title">Lo que dicen nuestros pacientes</h2>
      <div class="home-testimonios-grid">
        <div v-for="testimonio in testimonios" :key="testimonio.id" class="testimonio-card">
          <div class="testimonio-header">
            <img v-if="testimonio.fotoUrl" :src="testimonio.fotoUrl" :alt="testimonio.nombreCliente" class="testimonio-foto" />
            <div>
              <div class="testimonio-nombre">{{ testimonio.nombreCliente }}</div>
              <div v-if="testimonio.calificacion" class="testimonio-estrellas" aria-hidden="true">
                {{ "★".repeat(testimonio.calificacion) }}{{ "☆".repeat(5 - testimonio.calificacion) }}
              </div>
            </div>
          </div>
          <p class="testimonio-texto">"{{ testimonio.texto }}"</p>
        </div>
      </div>
    </section>

    <footer class="home-footer">
      <span>Maxilus SPA · José Alejandro Bernales 1610, Villa El Portal, Ovalle</span>
      <span>Lun–Vie 09:00–20:00 · Sáb 09:00–19:00 · +56 9 4422 9574</span>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 3rem;
}

.home-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.home-brand-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 50%;
}

.home-brand-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--brand-purple);
}

.home-hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1.5rem 4rem;
  background: radial-gradient(120% 100% at 50% 0%, var(--brand-purple-light) 0%, var(--page) 55%);
}

.home-hero-logo {
  width: 128px;
  height: 128px;
  object-fit: contain;
  margin-bottom: 1.5rem;
}

.home-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--brand-pink-light);
  color: #b80d61;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  margin-bottom: 1.5rem;
}

.home-hero-title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 2.75rem;
  line-height: 1.1;
  color: var(--text-primary);
  max-width: 640px;
  margin: 0 0 0.875rem;
}

.home-hero-subtitle {
  font-size: 1.06rem;
  color: var(--text-secondary);
  max-width: 520px;
  line-height: 1.6;
  margin: 0 0 2rem;
}

.home-hero-cta {
  font-size: 0.95rem;
  padding: 0.875rem 1.75rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(100, 20, 128, 0.28);
}

.home-specialties {
  padding: 0 3rem 4rem;
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
}

.home-specialties-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  text-align: center;
  margin: 0 0 1.5rem;
}

.home-specialties-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.home-specialty-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.375rem;
}

.home-specialty-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: var(--brand-purple-light);
  margin-bottom: 0.875rem;
}

.home-specialty-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.94rem;
  margin-bottom: 0.375rem;
}

.home-specialty-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.home-footer {
  border-top: 1px solid var(--border);
  padding: 1.75rem 3rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.home-banners {
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 3rem 3rem;
  width: 100%;
}

.banner-viewport {
  overflow: hidden;
  border-radius: 16px;
}

.banner-track {
  display: flex;
  transition: transform 0.5s ease;
}

.banner-slide {
  position: relative;
  flex: 0 0 100%;
  display: block;
  text-decoration: none;
}

.banner-slide img {
  width: 100%;
  height: 280px;
  object-fit: cover;
  display: block;
}

.banner-slide-title {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1rem 1.25rem;
  background: linear-gradient(0deg, rgba(32, 16, 41, 0.72), transparent);
  color: #fff;
  font-weight: 700;
}

.banner-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.875rem;
}

.banner-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: none;
  background: var(--gridline);
  cursor: pointer;
  padding: 0;
}

.banner-dot--active {
  background: var(--brand-purple);
}

.home-destacados {
  padding: 0 3rem 4rem;
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
}

.home-destacados-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.home-destacado-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.home-destacado-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.home-destacado-nombre {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.94rem;
  padding: 0.875rem 1rem 0.25rem;
}

.home-destacado-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 0 1rem 1rem;
}

.home-alianzas {
  padding: 0 3rem 4rem;
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
}

.home-alianzas-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}

.alianza-logo {
  display: flex;
  align-items: center;
  filter: grayscale(1);
  opacity: 0.75;
  transition: filter 0.15s ease, opacity 0.15s ease;
}

.alianza-logo:hover {
  filter: grayscale(0);
  opacity: 1;
}

.alianza-logo img {
  height: 40px;
  width: auto;
  object-fit: contain;
}

.home-testimonios {
  padding: 0 3rem 4rem;
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
}

.home-testimonios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.testimonio-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.375rem;
}

.testimonio-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.testimonio-foto {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.testimonio-nombre {
  font-weight: 700;
  font-size: 0.9rem;
}

.testimonio-estrellas {
  color: var(--brand-pink);
  font-size: 0.85rem;
}

.testimonio-texto {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 640px) {
  .home-header,
  .home-hero,
  .home-specialties,
  .home-banners,
  .home-destacados,
  .home-alianzas,
  .home-testimonios,
  .home-footer {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .home-hero-logo {
    width: 96px;
    height: 96px;
  }

  .home-hero-title {
    font-size: 2rem;
  }

  .banner-slide img {
    height: 180px;
  }
}
</style>
