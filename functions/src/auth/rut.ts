// Normaliza un RUT chileno para usarlo como clave de búsqueda consistente
// (sin puntos, sin guión, dígito verificador en mayúscula). No valida el
// dígito verificador — solo homogeneiza el formato de entrada.
export function normalizarRut(valor: string): string {
  return valor
    .trim()
    .toUpperCase()
    .replace(/[.\-\s]/g, "");
}
