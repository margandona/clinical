import { defineStore } from "pinia";
import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import type { Rol } from "@/types/auth";

interface AuthState {
  user: User | null;
  rol: Rol | null;
  clinicaId: string | null;
  profesionalId: string | null;
  pacienteId: string | null;
  loading: boolean;
  initialized: boolean;
}

let resolveReady: () => void;
export const authReady = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    rol: null,
    clinicaId: null,
    profesionalId: null,
    pacienteId: null,
    loading: true,
    initialized: false,
  }),
  actions: {
    init() {
      if (this.initialized) return;
      this.initialized = true;

      onIdTokenChanged(auth, async (user: User | null) => {
        if (!user) {
          this.user = null;
          this.rol = null;
          this.clinicaId = null;
          this.profesionalId = null;
          this.pacienteId = null;
          this.loading = false;
          resolveReady();
          return;
        }

        // rol/clinicaId/profesionalId/pacienteId vienen del custom claim
        // asignado por la Cloud Function `setUserRole` (Admin SDK), no de
        // un documento leible libremente por el cliente.
        const tokenResult = await user.getIdTokenResult();
        this.user = user;
        this.rol = (tokenResult.claims.rol as Rol | undefined) ?? null;
        this.clinicaId = (tokenResult.claims.clinicaId as string | undefined) ?? null;
        this.profesionalId = (tokenResult.claims.profesionalId as string | undefined) ?? null;
        this.pacienteId = (tokenResult.claims.pacienteId as string | undefined) ?? null;
        this.loading = false;
        resolveReady();
      });
    },
    async logout() {
      await signOut(auth);
    },
  },
});
