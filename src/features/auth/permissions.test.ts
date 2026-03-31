import { describe, expect, it } from "vitest";
import {
  canAccessFrontendRoute,
  getVisibleRbacModules,
  resolveScreenModule,
} from "./permissions";
import type { RbacMenuDTO, RbacModuleDTO, RbacScreenDTO } from "./services";

function buildMenu(partial: Partial<RbacMenuDTO>): RbacMenuDTO {
  return {
    modules: [],
    ...(partial as RbacMenuDTO),
  };
}

describe("resolveScreenModule", () => {
  it("prioriza module_key sobre otros campos", () => {
    const screen = {
      module_key: "CRM",
      module_name: "Gestión CRM",
    } as Pick<RbacScreenDTO, "module_key" | "module_name">;

    const result = resolveScreenModule(screen, null);
    expect(result).toEqual({ key: "crm", name: "Gestión CRM" });
  });

  it("usa module_name cuando no hay module_key", () => {
    const screen = {
      module_name: "Inventario",
    } as Pick<RbacScreenDTO, "module_key" | "module_name">;

    const result = resolveScreenModule(screen, null);
    expect(result).toEqual({ key: "inventario", name: "Inventario" });
  });

  it("hace fallback al módulo padre cuando no hay module_key ni module_name", () => {
    const screen = {} as Pick<RbacScreenDTO, "module_key" | "module_name">;
    const parent: Pick<RbacModuleDTO, "name" | "label" | "title"> = {
      name: "CRM",
    };

    const result = resolveScreenModule(screen, parent);
    expect(result).toEqual({ key: "crm", name: "CRM" });
  });
});

describe("canAccessFrontendRoute - rutas CRM", () => {
  const menu = buildMenu({
    modules: [
      {
        id: "crm-module",
        name: "CRM",
        frontend_route: "/crm",
        icon: "crm",
        screens: [
          {
            id: "customers",
            name: "Clientes",
            frontend_route: "/crm/customers",
          },
          {
            id: "campaigns",
            name: "Campañas",
            frontend_route: "/crm/campaigns",
          },
          {
            id: "analytics",
            name: "Analytics CRM",
            frontend_route: "/crm/analytics",
          },
        ],
      } as unknown as RbacModuleDTO,
    ],
  });

  it("permite acceder a /crm/customers y rutas hijas", () => {
    expect(canAccessFrontendRoute(menu, "/crm/customers")).toBe(true);
    expect(canAccessFrontendRoute(menu, "/crm/customers/123")).toBe(true);
  });

  it("permite acceder a /crm/campaigns/recipients-resolve cuando /crm/campaigns está en el menú", () => {
    expect(canAccessFrontendRoute(menu, "/crm/campaigns/recipients-resolve")).toBe(true);
    expect(canAccessFrontendRoute(menu, "/crm/campaigns/recipients-resolve/preview")).toBe(true);
  });

  it("permite acceder a rutas de analytics CRM específicas cuando /crm/analytics está en el menú", () => {
    expect(canAccessFrontendRoute(menu, "/crm/analytics/kpis")).toBe(true);
    expect(canAccessFrontendRoute(menu, "/crm/analytics/segmentation")).toBe(true);
    expect(canAccessFrontendRoute(menu, "/crm/analytics/monthly-evolution")).toBe(true);
  });

  it("no permite rutas analytics CRM no declaradas", () => {
    expect(canAccessFrontendRoute(menu, "/crm/analytics/unknown")).toBe(false);
  });
});

describe("agrupación y filtrado por módulo usando resolveScreenModule", () => {
  function groupScreensByModule(menu: RbacMenuDTO): Record<string, string[]> {
    const visibleModules = getVisibleRbacModules(menu);
    const result: Record<string, string[]> = {};

    for (const module of visibleModules) {
      for (const screen of module.screens ?? []) {
        const resolved = resolveScreenModule(
          {
            module_key: (screen as RbacScreenDTO).module_key,
            module_name: (screen as RbacScreenDTO).module_name,
          },
          module,
        );

        const key = resolved?.key ?? "desconocido";
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push(screen.frontend_route ?? "");
      }
    }

    return result;
  }

  const menu = buildMenu({
    modules: [
      {
        id: "inventory-module",
        name: "Inventario",
        screens: [
          {
            id: "products",
            name: "Productos",
            frontend_route: "/inventory/products",
            module_key: "inventory",
          },
          {
            id: "stock",
            name: "Stock",
            frontend_route: "/inventory/stock",
          },
        ],
      },
      {
        id: "crm-module",
        name: "CRM",
        screens: [
          {
            id: "customers",
            name: "Clientes",
            frontend_route: "/crm/customers",
            module_name: "CRM",
          },
          {
            id: "campaigns",
            name: "Campañas",
            frontend_route: "/crm/campaigns",
          },
        ],
      },
    ] as unknown as RbacModuleDTO[],
  });

  it("agrupa pantallas por módulo usando module_key/module_name y fallback al módulo padre", () => {
    const grouped = groupScreensByModule(menu);

    expect(grouped.inventory).toContain("/inventory/products");
    expect(grouped.inventory).toContain("/inventory/stock");

    expect(grouped.crm).toContain("/crm/customers");
    expect(grouped.crm).toContain("/crm/campaigns");
  });
});
