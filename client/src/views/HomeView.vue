<script setup lang="ts">
import logo from "@/assets/logo.png";

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

@media (max-width: 640px) {
  .home-header,
  .home-hero,
  .home-specialties,
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
}
</style>
