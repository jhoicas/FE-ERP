# TODO - Integración AdminPage en navegación

- [x] Actualizar ruta `/admin` en `src/App.tsx` para usar `<ProtectedRoute><AdminPage /></ProtectedRoute>`.
- [x] Actualizar `src/components/layout/AppSidebar.tsx`:
  - [x] Agregar `requiresSuperAdmin: true` al ítem **Super Admin**.
  - [x] Filtrar renderizado de screens para ocultar ítems `requiresSuperAdmin` cuando el usuario no tenga rol `super_admin`.
- [x] Marcar tareas completadas y validar consistencia final.
