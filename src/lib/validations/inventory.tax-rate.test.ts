import { describe, expect, it } from "vitest";

import { createProductRequestSchema } from "@/lib/validations/inventory";

const validBasePayload = {
  sku: "SKU-001",
  name: "Producto test",
  description: "Descripción",
  price: "10000",
  unspsc_code: "12345678",
  unit_measure: "94",
};

describe("createProductRequestSchema tax_rate", () => {
  it("acepta personalizado decimal 7.5", () => {
    const result = createProductRequestSchema.parse({
      ...validBasePayload,
      tax_rate: "7.5",
    });

    expect(result.tax_rate).toBe(7.5);
    expect(typeof result.tax_rate).toBe("number");
  });

  it("bloquea -1 con mensaje de rango", () => {
    const result = createProductRequestSchema.safeParse({
      ...validBasePayload,
      tax_rate: "-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const taxRateIssue = result.error.issues.find((issue) => issue.path.includes("tax_rate"));
      expect(taxRateIssue?.message).toBe("Debe estar entre 0 y 100");
    }
  });

  it("bloquea 101 con mensaje de rango", () => {
    const result = createProductRequestSchema.safeParse({
      ...validBasePayload,
      tax_rate: "101",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const taxRateIssue = result.error.issues.find((issue) => issue.path.includes("tax_rate"));
      expect(taxRateIssue?.message).toBe("Debe estar entre 0 y 100");
    }
  });

  it("bloquea vacío con mensaje requerido", () => {
    const result = createProductRequestSchema.safeParse({
      ...validBasePayload,
      tax_rate: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const taxRateIssue = result.error.issues.find((issue) => issue.path.includes("tax_rate"));
      expect(taxRateIssue?.message).toBe("Impuesto requerido");
    }
  });
});
