-- +goose Up
-- Índices para acelerar resolución de destinatarios por category_id.

CREATE INDEX IF NOT EXISTS idx_invoices_company_customer
  ON invoices (company_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_invoice_details_invoice_product
  ON invoice_details (invoice_id, product_id);

-- products(company_id, category_id) o products(company_id, category_uuid)
-- según la relación disponible en el esquema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'category_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_company_category ON products (company_id, category_id)';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'category_uuid'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_company_category_uuid ON products (company_id, category_uuid)';
  END IF;
END
$$;

-- Si la categoría está guardada en JSONB metadata, crear GIN opcional.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'metadata'
      AND udt_name = 'jsonb'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_category_jsonb ON products USING GIN ((metadata->''category_id''))';
  END IF;
END
$$;

-- +goose Down

DROP INDEX IF EXISTS idx_products_category_jsonb;
DROP INDEX IF EXISTS idx_products_company_category;
DROP INDEX IF EXISTS idx_products_company_category_uuid;
DROP INDEX IF EXISTS idx_invoice_details_invoice_product;
DROP INDEX IF EXISTS idx_invoices_company_customer;
