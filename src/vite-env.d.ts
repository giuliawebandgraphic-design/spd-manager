/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del backend Laravel (es. https://api.tuodominio.it). Vuoto = stesso dominio / proxy Vite. */
  readonly VITE_API_URL?: string;
  /** Solo sviluppo: backend locale a cui Vite inoltra /api. */
  readonly VITE_DEV_API_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
