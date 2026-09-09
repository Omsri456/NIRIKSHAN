/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for the API origin, e.g. https://api.nirikshan.gov.in. Empty in dev (Vite proxies /api). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
