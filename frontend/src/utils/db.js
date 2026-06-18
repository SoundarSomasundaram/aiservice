// Mock Enterprise Database (Relational JSON Store)

export const initialTables = {
  products: [
    { id: 1, name: "Enterprise Server Rack", category: "Hardware", price: 1200.00, cost: 750.00 },
    { id: 2, name: "Gigabit Managed Switch", category: "Networking", price: 450.00, cost: 250.00 },
    { id: 3, name: "OptiLink Fiber Cable", category: "Cables", price: 85.00, cost: 35.00 },
    { id: 4, name: "Uninterruptible Power Supply (UPS)", category: "Power", price: 350.00, cost: 180.00 },
    { id: 5, name: "ProNAS Storage Array 16TB", category: "Storage", price: 1800.00, cost: 1100.00 },
    { id: 6, name: "Industrial IoT Gateway", category: "Networking", price: 290.00, cost: 160.00 },
    { id: 7, name: "SecurEdge Firewall", category: "Networking", price: 899.00, cost: 520.00 },
    { id: 8, name: "High-Density Patch Panel", category: "Networking", price: 120.00, cost: 60.00 },
    { id: 9, name: "Wi-Fi 7 Enterprise AP", category: "Networking", price: 399.00, cost: 220.00 },
    { id: 10, name: "Cat8 Shielded Ethernet Cable", category: "Cables", price: 45.00, cost: 15.00 }
  ],
  warehouses: [
    { id: 101, name: "Chennai Main Hub", location: "Chennai", capacity: 50000 },
    { id: 102, name: "Mumbai Distribution Center", location: "Mumbai", capacity: 75000 },
    { id: 103, name: "Delhi Logistics Park", location: "Delhi", capacity: 60000 },
    { id: 104, name: "Bengaluru Tech Depot", location: "Bengaluru", capacity: 40000 }
  ],
  inventory: [
    // Chennai (101) - High stockout risks!
    { id: 1, product_id: 1, warehouse_id: 101, current_stock: 15, reorder_point: 10 },
    { id: 2, product_id: 2, warehouse_id: 101, current_stock: 0, reorder_point: 12 }, // STOCKOUT RISK
    { id: 3, product_id: 3, warehouse_id: 101, current_stock: 120, reorder_point: 50 },
    { id: 4, product_id: 4, warehouse_id: 101, current_stock: 3, reorder_point: 8 },  // STOCKOUT RISK
    { id: 5, product_id: 5, warehouse_id: 101, current_stock: 1, reorder_point: 5 },  // STOCKOUT RISK
    
    // Mumbai (102) - Healthy stocks
    { id: 6, product_id: 1, warehouse_id: 102, current_stock: 45, reorder_point: 10 },
    { id: 7, product_id: 2, warehouse_id: 102, current_stock: 35, reorder_point: 12 },
    { id: 8, product_id: 5, warehouse_id: 102, current_stock: 22, reorder_point: 5 },
    { id: 9, product_id: 7, warehouse_id: 102, current_stock: 18, reorder_point: 8 },

    // Delhi (103) - Healthy stocks
    { id: 10, product_id: 2, warehouse_id: 103, current_stock: 40, reorder_point: 12 },
    { id: 11, product_id: 4, warehouse_id: 103, current_stock: 25, reorder_point: 8 },
    { id: 12, product_id: 6, warehouse_id: 103, current_stock: 30, reorder_point: 15 },
    { id: 13, product_id: 9, warehouse_id: 103, current_stock: 50, reorder_point: 20 },

    // Bengaluru (104) - Low stock on IoT Gateways
    { id: 14, product_id: 6, warehouse_id: 104, current_stock: 2, reorder_point: 10 }, // STOCKOUT RISK
    { id: 15, product_id: 8, warehouse_id: 104, current_stock: 30, reorder_point: 15 },
    { id: 16, product_id: 9, warehouse_id: 104, current_stock: 28, reorder_point: 20 },
    { id: 17, product_id: 10, warehouse_id: 104, current_stock: 500, reorder_point: 100 }
  ],
  sales: [
    // Let's seed Sales across regions & dates.
    // Q1 (Jan, Feb, Mar 2026) and Q2 (Apr, May, Jun 2026)
    
    // Chennai (Warehouse 101) Sales - High in Jan-Apr, dramatic drop in May!
    { id: 1, product_id: 1, quantity: 5, revenue: 6000.00, sale_date: "2026-01-15", warehouse_id: 101 },
    { id: 2, product_id: 2, quantity: 20, revenue: 9000.00, sale_date: "2026-01-20", warehouse_id: 101 },
    { id: 3, product_id: 5, quantity: 8, revenue: 14400.00, sale_date: "2026-02-10", warehouse_id: 101 },
    { id: 4, product_id: 7, quantity: 12, revenue: 10788.00, sale_date: "2026-02-28", warehouse_id: 101 },
    { id: 5, product_id: 2, quantity: 25, revenue: 11250.00, sale_date: "2026-03-05", warehouse_id: 101 },
    { id: 6, product_id: 9, quantity: 30, revenue: 11970.00, sale_date: "2026-03-22", warehouse_id: 101 },
    { id: 7, product_id: 1, quantity: 8, revenue: 9600.00, sale_date: "2026-04-12", warehouse_id: 101 },
    { id: 8, product_id: 5, quantity: 10, revenue: 18000.00, sale_date: "2026-04-25", warehouse_id: 101 },
    // MAY 2026 Drop (Monsoon Flooding & Port Lockout in Chennai)
    { id: 9, product_id: 2, quantity: 2, revenue: 900.00, sale_date: "2026-05-08", warehouse_id: 101 },
    { id: 10, product_id: 9, quantity: 4, revenue: 1596.00, sale_date: "2026-05-18", warehouse_id: 101 },
    { id: 11, product_id: 3, quantity: 10, revenue: 850.00, sale_date: "2026-05-27", warehouse_id: 101 },
    // JUNE 2026 Slow recovery
    { id: 12, product_id: 1, quantity: 2, revenue: 2400.00, sale_date: "2026-06-02", warehouse_id: 101 },
    { id: 13, product_id: 4, quantity: 5, revenue: 1750.00, sale_date: "2026-06-10", warehouse_id: 101 },

    // Mumbai (Warehouse 102) Sales - Consistent and high
    { id: 14, product_id: 1, quantity: 12, revenue: 14400.00, sale_date: "2026-01-10", warehouse_id: 102 },
    { id: 15, product_id: 5, quantity: 15, revenue: 27000.00, sale_date: "2026-02-14", warehouse_id: 102 },
    { id: 16, product_id: 7, quantity: 15, revenue: 13485.00, sale_date: "2026-03-18", warehouse_id: 102 },
    { id: 17, product_id: 1, quantity: 10, revenue: 12000.00, sale_date: "2026-04-05", warehouse_id: 102 },
    { id: 18, product_id: 5, quantity: 18, revenue: 32400.00, sale_date: "2026-05-15", warehouse_id: 102 },
    { id: 19, product_id: 7, quantity: 20, revenue: 17980.00, sale_date: "2026-06-05", warehouse_id: 102 },

    // Delhi (Warehouse 103) Sales - Consistent
    { id: 20, product_id: 2, quantity: 30, revenue: 13500.00, sale_date: "2026-01-22", warehouse_id: 103 },
    { id: 21, product_id: 9, quantity: 40, revenue: 15960.00, sale_date: "2026-02-20", warehouse_id: 103 },
    { id: 22, product_id: 4, quantity: 18, revenue: 6300.00, sale_date: "2026-03-11", warehouse_id: 103 },
    { id: 23, product_id: 2, quantity: 22, revenue: 9900.00, sale_date: "2026-04-18", warehouse_id: 103 },
    { id: 24, product_id: 9, quantity: 35, revenue: 13965.00, sale_date: "2026-05-20", warehouse_id: 103 },
    { id: 25, product_id: 6, quantity: 15, revenue: 4350.00, sale_date: "2026-06-11", warehouse_id: 103 },

    // Bengaluru (Warehouse 104) Sales - Healthy
    { id: 26, product_id: 10, quantity: 200, revenue: 9000.00, sale_date: "2026-01-08", warehouse_id: 104 },
    { id: 27, product_id: 6, quantity: 8, revenue: 2320.00, sale_date: "2026-02-12", warehouse_id: 104 },
    { id: 28, product_id: 8, quantity: 25, revenue: 3000.00, sale_date: "2026-03-14", warehouse_id: 104 },
    { id: 29, product_id: 9, quantity: 20, revenue: 7980.00, sale_date: "2026-04-20", warehouse_id: 104 },
    { id: 30, product_id: 6, quantity: 10, revenue: 2900.00, sale_date: "2026-05-10", warehouse_id: 104 },
    { id: 31, product_id: 10, quantity: 250, revenue: 11250.00, sale_date: "2026-06-01", warehouse_id: 104 }
  ],
  suppliers: [
    { id: 201, name: "Apex Electronix", contact: "contact@apex.in", base_lead_time: 5 },
    { id: 202, name: "OptiGlobe Cables", contact: "support@optiglobe.com", base_lead_time: 7 },
    { id: 203, name: "LogiTrans India", contact: "delays@logitrans.in", base_lead_time: 4 }, // CAUSES DELAYS
    { id: 204, name: "Innova Storage Corp", contact: "sales@innovastorage.com", base_lead_time: 10 }
  ],
  purchase_orders: [
    { id: 301, supplier_id: 201, product_id: 1, quantity: 10, order_date: "2026-04-01", delivery_date: "2026-04-05", status: "Delivered", delay_days: 0 },
    { id: 302, supplier_id: 201, product_id: 2, quantity: 30, order_date: "2026-04-10", delivery_date: "2026-04-17", status: "Delivered", delay_days: 2 },
    { id: 303, supplier_id: 202, product_id: 3, quantity: 500, order_date: "2026-04-15", delivery_date: "2026-04-22", status: "Delivered", delay_days: 0 },
    
    // LogiTrans India POs (203) - Horrible delay metrics
    { id: 304, supplier_id: 203, product_id: 4, quantity: 15, order_date: "2026-04-02", delivery_date: "2026-04-20", status: "Delivered", delay_days: 14 }, // Massive delay
    { id: 305, supplier_id: 203, product_id: 6, quantity: 20, order_date: "2026-04-12", delivery_date: "2026-05-02", status: "Delivered", delay_days: 16 }, // Massive delay
    { id: 306, supplier_id: 203, product_id: 2, quantity: 40, order_date: "2026-05-01", delivery_date: "2026-05-22", status: "Delivered", delay_days: 17 }, // Massive delay
    { id: 307, supplier_id: 203, product_id: 8, quantity: 25, order_date: "2026-05-10", delivery_date: "2026-05-30", status: "Delivered", delay_days: 16 }, // Massive delay
    { id: 308, supplier_id: 203, product_id: 9, quantity: 15, order_date: "2026-06-01", delivery_date: null, status: "Delayed", delay_days: 12 },          // Currently delayed
    
    { id: 309, supplier_id: 204, product_id: 5, quantity: 8, order_date: "2026-04-20", delivery_date: "2026-04-30", status: "Delivered", delay_days: 0 },
    { id: 310, supplier_id: 204, product_id: 5, quantity: 5, order_date: "2026-05-12", delivery_date: "2026-05-25", status: "Delivered", delay_days: 3 }
  ]
};

// Database metadata definitions used for RAG schema lookup
export const databaseSchema = [
  {
    table: "products",
    description: "Contains product specifications, names, categories, cost price and selling price.",
    columns: [
      { name: "id", type: "INTEGER", description: "Unique primary key identifier for the product." },
      { name: "name", type: "VARCHAR", description: "Name of the product (e.g. Enterprise Server Rack, Gigabit Managed Switch)." },
      { name: "category", type: "VARCHAR", description: "Category grouping (e.g. Hardware, Networking, Cables, Power, Storage)." },
      { name: "price", type: "DECIMAL", description: "The unit selling price of the product (revenue per unit)." },
      { name: "cost", type: "DECIMAL", description: "The unit cost price to produce/acquire the product (cost per unit)." }
    ]
  },
  {
    table: "warehouses",
    description: "Registers active warehouses, capacity and regional locations (cities).",
    columns: [
      { name: "id", type: "INTEGER", description: "Unique primary key identifier for the warehouse." },
      { name: "name", type: "VARCHAR", description: "Full name of the warehouse facility." },
      { name: "location", type: "VARCHAR", description: "City where the warehouse is situated (e.g., Chennai, Mumbai, Delhi, Bengaluru)." },
      { name: "capacity", type: "INTEGER", description: "Total inventory volume capacity of the warehouse in units." }
    ]
  },
  {
    table: "inventory",
    description: "Tracks current stock counts and safety levels/reorder points of products in specific warehouses.",
    columns: [
      { name: "id", type: "INTEGER", description: "Unique primary key identifier." },
      { name: "product_id", type: "INTEGER", description: "Foreign key linking to products.id." },
      { name: "warehouse_id", type: "INTEGER", description: "Foreign key linking to warehouses.id." },
      { name: "current_stock", type: "INTEGER", description: "Current number of units physically in stock." },
      { name: "reorder_point", type: "INTEGER", description: "Minimum stock threshold. If current_stock <= reorder_point, the product is at stockout risk!" }
    ]
  },
  {
    table: "sales",
    description: "Stores historical retail transactions, quantities sold, dates, and warehouse where inventory was shipped from.",
    columns: [
      { name: "id", type: "INTEGER", description: "Unique transaction identifier." },
      { name: "product_id", type: "INTEGER", description: "Foreign key linking to products.id." },
      { name: "quantity", type: "INTEGER", description: "Number of units sold in the transaction." },
      { name: "revenue", type: "DECIMAL", description: "Total revenue earned (quantity * product price)." },
      { name: "sale_date", type: "DATE", description: "Date of transaction formatted as YYYY-MM-DD." },
      { name: "warehouse_id", type: "INTEGER", description: "Foreign key linking to warehouses.id (shipped warehouse)." }
    ]
  },
  {
    table: "suppliers",
    description: "Records of partner suppliers, base lead times, and contacts.",
    columns: [
      { name: "id", type: "INTEGER", description: "Unique primary key identifier for the supplier." },
      { name: "name", type: "VARCHAR", description: "Name of the supplier company (e.g., Apex Electronix, LogiTrans India)." },
      { name: "contact", type: "VARCHAR", description: "Supplier contact email." },
      { name: "base_lead_time", type: "INTEGER", description: "Default supply lead time in days." }
    ]
  },
  {
    table: "purchase_orders",
    description: "Contains logs of items ordered from suppliers, delivery dates, delays, and fulfillment statuses.",
    columns: [
      { name: "id", type: "INTEGER", description: "Unique purchase order identifier." },
      { name: "supplier_id", type: "INTEGER", description: "Foreign key linking to suppliers.id." },
      { name: "product_id", type: "INTEGER", description: "Foreign key linking to products.id." },
      { name: "quantity", type: "INTEGER", description: "Units ordered." },
      { name: "order_date", type: "DATE", description: "Date ordered (YYYY-MM-DD)." },
      { name: "delivery_date", type: "DATE", description: "Actual date delivered (YYYY-MM-DD), null if still pending." },
      { name: "status", type: "VARCHAR", description: "Fulfillment status ('Delivered', 'Delayed', 'Pending')." },
      { name: "delay_days", type: "INTEGER", description: "Number of days delivery was delayed past scheduled lead time." }
    ]
  }
];
