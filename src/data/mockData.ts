// ===== DASHBOARD =====
export const kpis = [
  { label: "Ingresos Brutos", value: "$124,850,000", change: "+12.5%", positive: true },
  { label: "Margen Global", value: "34.2%", change: "+2.1pp", positive: true },
  { label: "Tickets PQR Abiertos", value: "18", change: "-3", positive: true },
  { label: "Tareas Pendientes", value: "42", change: "+5", positive: false },
];

export const salesByChannel = [
  { month: "Ene", ecommerce: 18500, tienda: 12300 },
  { month: "Feb", ecommerce: 21200, tienda: 11800 },
  { month: "Mar", ecommerce: 19800, tienda: 13500 },
  { month: "Abr", ecommerce: 24100, tienda: 14200 },
  { month: "May", ecommerce: 26700, tienda: 13900 },
  { month: "Jun", ecommerce: 29300, tienda: 15100 },
];

export const topProducts = [
  { name: "Aceite Esencial de Lavanda 30ml", margin: "48.2%", sales: 1240, revenue: "$18,600,000" },
  { name: "Crema Facial Aloe Vera 50g", margin: "42.7%", sales: 980, revenue: "$14,700,000" },
  { name: "Té Verde Orgánico 100g", margin: "39.5%", sales: 2100, revenue: "$12,600,000" },
  { name: "Jabón Artesanal Caléndula", margin: "38.1%", sales: 1560, revenue: "$10,920,000" },
  { name: "Shampoo de Romero 250ml", margin: "36.8%", sales: 870, revenue: "$9,570,000" },
];

// ===== INVENTARIO =====
export const products = [
  { id: "P001", name: "Aceite Esencial de Lavanda 30ml", sku: "AEL-030", stock: 245, unit: "und", category: "Aceites", warehouse: "Bodega Central" },
  { id: "P002", name: "Crema Facial Aloe Vera 50g", sku: "CFA-050", stock: 189, unit: "und", category: "Cremas", warehouse: "Bodega Central" },
  { id: "P003", name: "Té Verde Orgánico 100g", sku: "TVO-100", stock: 520, unit: "und", category: "Infusiones", warehouse: "Bodega Norte" },
  { id: "P004", name: "Jabón Artesanal Caléndula", sku: "JAC-001", stock: 312, unit: "und", category: "Jabones", warehouse: "Bodega Central" },
  { id: "P005", name: "Shampoo de Romero 250ml", sku: "SHR-250", stock: 67, unit: "und", category: "Capilar", warehouse: "Bodega Sur" },
  { id: "P006", name: "Extracto de Equinácea 60ml", sku: "EEQ-060", stock: 98, unit: "und", category: "Extractos", warehouse: "Bodega Central" },
  { id: "P007", name: "Bálsamo Labial Menta", sku: "BLM-015", stock: 430, unit: "und", category: "Labial", warehouse: "Bodega Norte" },
  { id: "P008", name: "Aceite de Coco Orgánico 200ml", sku: "ACO-200", stock: 156, unit: "und", category: "Aceites", warehouse: "Bodega Sur" },
];

export const warehouses = [
  { name: "Bodega Central", location: "Bogotá, Cundinamarca", capacity: "85%", products: 142, manager: "Carlos Méndez" },
  { name: "Bodega Norte", location: "Medellín, Antioquia", capacity: "62%", products: 89, manager: "Ana Restrepo" },
  { name: "Bodega Sur", location: "Cali, Valle del Cauca", capacity: "73%", products: 67, manager: "Luis Patiño" },
];

export const replenishmentAlerts = [
  { product: "Shampoo de Romero 250ml", currentStock: 12, daysLeft: 3, suggestedQty: 200, priority: "critical" as const },
  { product: "Extracto de Equinácea 60ml", currentStock: 28, daysLeft: 5, suggestedQty: 150, priority: "critical" as const },
  { product: "Crema Facial Aloe Vera 50g", currentStock: 45, daysLeft: 9, suggestedQty: 120, priority: "warning" as const },
  { product: "Aceite de Coco Orgánico 200ml", currentStock: 68, daysLeft: 12, suggestedQty: 80, priority: "warning" as const },
  { product: "Aceite Esencial de Lavanda 30ml", currentStock: 180, daysLeft: 25, suggestedQty: 0, priority: "healthy" as const },
  { product: "Té Verde Orgánico 100g", currentStock: 320, daysLeft: 45, suggestedQty: 0, priority: "healthy" as const },
  { product: "Jabón Artesanal Caléndula", currentStock: 210, daysLeft: 30, suggestedQty: 0, priority: "healthy" as const },
];

// ===== FACTURACIÓN =====
export const invoices = [
  { id: "FV-2024-001", client: "Naturista El Bosque", date: "2024-12-15", total: "$3,450,000", status: "Enviado DIAN" as const },
  { id: "FV-2024-002", client: "Herbario Nacional", date: "2024-12-14", total: "$1,280,000", status: "Enviado DIAN" as const },
  { id: "FV-2024-003", client: "Tienda Orgánica Vida", date: "2024-12-13", total: "$5,670,000", status: "Borrador" as const },
  { id: "FV-2024-004", client: "Green Health SAS", date: "2024-12-12", total: "$2,100,000", status: "Enviado DIAN" as const },
  { id: "FV-2024-005", client: "EcoVida Market", date: "2024-12-11", total: "$890,000", status: "Borrador" as const },
  { id: "FV-2024-006", client: "Farmacia Natural Plus", date: "2024-12-10", total: "$4,320,000", status: "Enviado DIAN" as const },
];

export const invoiceClients = [
  "Naturista El Bosque", "Herbario Nacional", "Tienda Orgánica Vida", 
  "Green Health SAS", "EcoVida Market", "Farmacia Natural Plus"
];

export const invoiceProducts = [
  { name: "Aceite Esencial de Lavanda 30ml", price: 15000 },
  { name: "Crema Facial Aloe Vera 50g", price: 22000 },
  { name: "Té Verde Orgánico 100g", price: 8500 },
  { name: "Jabón Artesanal Caléndula", price: 7000 },
  { name: "Shampoo de Romero 250ml", price: 18500 },
];

// ===== CRM =====
export const clients = [
  { id: "C001", name: "Naturista El Bosque", contact: "María Rodríguez", email: "maria@elbosque.co", phone: "+57 301 456 7890", tier: "gold" as const, totalPurchases: "$45,200,000", lastOrder: "2024-12-10" },
  { id: "C002", name: "Herbario Nacional", contact: "Pedro García", email: "pedro@herbario.co", phone: "+57 310 234 5678", tier: "gold" as const, totalPurchases: "$38,900,000", lastOrder: "2024-12-08" },
  { id: "C003", name: "Tienda Orgánica Vida", contact: "Laura Martínez", email: "laura@vidaorganica.co", phone: "+57 315 678 1234", tier: "silver" as const, totalPurchases: "$22,100,000", lastOrder: "2024-12-05" },
  { id: "C004", name: "Green Health SAS", contact: "Andrés López", email: "andres@greenhealth.co", phone: "+57 320 345 6789", tier: "silver" as const, totalPurchases: "$18,500,000", lastOrder: "2024-11-28" },
  { id: "C005", name: "EcoVida Market", contact: "Diana Ruiz", email: "diana@ecovida.co", phone: "+57 318 901 2345", tier: "bronze" as const, totalPurchases: "$8,700,000", lastOrder: "2024-11-15" },
  { id: "C006", name: "Farmacia Natural Plus", contact: "Roberto Sánchez", email: "roberto@naturalplus.co", phone: "+57 305 567 8901", tier: "gold" as const, totalPurchases: "$52,300,000", lastOrder: "2024-12-12" },
];

export const clientTimeline = [
  { type: "call" as const, date: "2024-12-10", description: "Llamada para confirmar pedido de aceites esenciales. Cliente satisfecho con la calidad.", user: "Ana M." },
  { type: "email" as const, date: "2024-12-08", description: "Envío de catálogo actualizado con nuevos productos de temporada.", user: "Carlos R." },
  { type: "order" as const, date: "2024-12-05", description: "Pedido #ORD-2024-089 por $3,450,000. 50 aceites de lavanda + 30 cremas faciales.", user: "Sistema" },
  { type: "call" as const, date: "2024-11-28", description: "Seguimiento post-venta. Cliente reporta excelente rotación de productos.", user: "Ana M." },
  { type: "email" as const, date: "2024-11-20", description: "Propuesta comercial para línea de jabones artesanales.", user: "Carlos R." },
  { type: "ticket" as const, date: "2024-11-15", description: "Ticket PQR: Producto recibido con empaque dañado. Resuelto con reposición.", user: "Soporte" },
];

export const clientTickets = [
  { id: "TK-045", subject: "Demora en entrega de pedido #ORD-089", status: "Abierto", sentiment: "negative" as const, date: "2024-12-09" },
  { id: "TK-038", subject: "Consulta sobre certificaciones orgánicas", status: "Resuelto", sentiment: "positive" as const, date: "2024-11-25" },
  { id: "TK-031", subject: "Solicitud de descuento por volumen", status: "Resuelto", sentiment: "positive" as const, date: "2024-11-10" },
  { id: "TK-028", subject: "Producto con empaque dañado", status: "Resuelto", sentiment: "negative" as const, date: "2024-10-30" },
];
