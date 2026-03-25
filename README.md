# NaturERP — Frontend

Frontend del sistema ERP modular: autenticación, dashboard analítico, inventario, facturación y CRM. Conectado a la API en `https://api.ludoia.com`.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **React Query** (TanStack Query) para datos remotos
- **Zod** para validación de entradas y respuestas API
- **Axios** (cliente centralizado con JWT en cookies)
- **React Router** + **React Hook Form** + **js-cookie**

## Estructura

- `src/features/` — Módulos por dominio: `auth`, `analytics`, `inventory`, `billing`, `crm`
- `src/lib/api/` — Cliente HTTP e interceptores (token), utilidades de error
- `src/pages/` — Vistas (Dashboard, Inventario, Facturación, CRM, Login, etc.)
- `src/components/` — UI compartida y layout (sidebar, header)

## Cómo correr

```bash
# Instalar dependencias
npm i

# Desarrollo
npm run dev

# Build
npm run build

# Preview del build
npm run preview
```

## Variables de entorno

El cliente API usa por defecto la base URL `https://api.ludoia.com`. Si necesitas otro origen, configura la variable de entorno correspondiente y actualiza `src/lib/api/client.ts`.

Para OAuth de Email (Google/Microsoft), crea un `.env.local` a partir de `.env.example` y completa:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_MSAL_CLIENT_ID`
- `VITE_MSAL_TENANT_ID` (opcional, por defecto `common`)
- `VITE_MSAL_REDIRECT_URI` (opcional, por defecto `window.location.origin`)

## Scripts

| Script        | Descripción              |
|---------------|--------------------------|
| `npm run dev` | Servidor de desarrollo   |
| `npm run build` | Build de producción   |
| `npm run preview` | Sirve el build local |
| `npm run lint` | Ejecuta ESLint          |
| `npm run test` | Ejecuta tests            |
