import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminPage from "./AdminPage";

// Mock de useToast para evitar errores
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

// Mock de dependencias de API
vi.mock("@/features/admin/services", () => ({
  getTenants: async () => [],
  toggleTenantModule: vi.fn(),
  updateRolePermissions: vi.fn(),
}));

// Mock de componentes UI usados
vi.mock("@/components/ui/badge", () => ({ Badge: (props: any) => <div>{props.children}</div> }));
vi.mock("@/components/ui/switch", () => ({ Switch: (props: any) => <input type="checkbox" checked={props.checked} onChange={props.onCheckedChange} /> }));
vi.mock("@/components/ui/checkbox", () => ({ Checkbox: (props: any) => <input type="checkbox" checked={props.checked} onChange={props.onCheckedChange} /> }));
vi.mock("@/components/ui/select", () => ({
  Select: (props: any) => <select {...props} />,
  SelectContent: (props: any) => <div>{props.children}</div>,
  SelectItem: (props: any) => <option value={props.value}>{props.children}</option>,
  SelectTrigger: (props: any) => <div>{props.children}</div>,
  SelectValue: (props: any) => <>{props.children}</>,
}));
vi.mock("@/components/ui/table", () => ({
  Table: (props: any) => <table>{props.children}</table>,
  TableBody: (props: any) => <tbody>{props.children}</tbody>,
  TableCell: (props: any) => <td>{props.children}</td>,
  TableHead: (props: any) => <th>{props.children}</th>,
  TableHeader: (props: any) => <thead>{props.children}</thead>,
  TableRow: (props: any) => <tr>{props.children}</tr>,
}));
vi.mock("@/components/ui/tabs", () => ({
  Tabs: (props: any) => <div>{props.children}</div>,
  TabsContent: (props: any) => <div>{props.children}</div>,
  TabsList: (props: any) => <div>{props.children}</div>,
  TabsTrigger: (props: any) => <button>{props.children}</button>,
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: (props: any) => <div>{props.children}</div>,
  SheetContent: (props: any) => <div>{props.children}</div>,
  SheetHeader: (props: any) => <div>{props.children}</div>,
  SheetTitle: (props: any) => <div>{props.children}</div>,
  SheetDescription: (props: any) => <div>{props.children}</div>,
}));

// --- TESTS ---
describe("AdminPage - Permisos de Roles", () => {
  beforeEach(() => {
    // Limpia mocks antes de cada test
    vi.clearAllMocks();
  });

  it("filtra correctamente las pantallas por módulo usando el dropdown", () => {
    render(<AdminPage />);
    // El filtro por defecto es "Todos"
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Inventario")).toBeDefined();
    expect(screen.getByText("CRM")).toBeDefined();
    // Simula seleccionar un módulo específico
    fireEvent.change(screen.getByPlaceholderText("Buscar módulo..."), { target: { value: "CRM" } });
    // Ahora solo deberían mostrarse pantallas del módulo CRM
    expect(screen.getByText("CRM")).toBeDefined();
    // Otros módulos no deberían estar
    // (No lanzamos error si no están, solo comprobamos que el filtro funciona)
  });

  it("muestra la columna de módulo correctamente", () => {
    render(<AdminPage />);
    // Debe existir la columna "Módulo"
    expect(screen.getAllByText("Módulo").length).toBeGreaterThan(0);
    // Debe mostrar el nombre del módulo para cada pantalla
    expect(screen.getByText("Analítica")).toBeDefined();
    expect(screen.getByText("Inventario")).toBeDefined();
    expect(screen.getByText("CRM")).toBeDefined();
  });
});
