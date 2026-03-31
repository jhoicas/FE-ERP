# TODO - CRM separar Analítica y Remarketing en páginas

- [x] Actualizar `src/pages/CRMPage.tsx` para dejar solo Directorio (sin tabs de Analítica/Remarketing).
- [x] Crear `src/pages/CRMRemarketingPage.tsx` y usar `CRMRemarketingTab`.
- [x] Crear `src/pages/CRMAnalyticsPage.tsx` y usar `CrmAnalyticsDashboard`.
- [x] Actualizar rutas en `src/App.tsx`:
  - [x] `/crm/remarketing`
  - [x] `/crm/analytics`
  - [x] Mantener `/crm/customers` en `CRMPage`.
- [x] Actualizar `src/components/layout/AppSidebar.tsx` para agregar accesos:
  - [x] Analítica → `/crm/analytics`
  - [x] Remarketing → `/crm/remarketing`
