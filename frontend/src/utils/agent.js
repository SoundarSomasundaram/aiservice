// LangGraph Agent Workflow Simulator
// Orchestrates: RAG -> SQL Gen -> Execution & Validation -> Self-Correction Loop -> Insights & Chart Mapping

import { databaseSchema } from './db.js';
import { executeSQL } from './sqlEngine.js';
import { API_BASE_URL } from '../config.js';

// 1. RAG Node: Keyword-based semantic schema search
export function retrieveSchema(query, activeSchema = databaseSchema) {
  const normalizedQuery = query.toLowerCase();
  const matchedTables = [];
  
  // Keyword mapping for schema retrieval
  const keywords = {
    products: ["product", "item", "inventory", "category", "price", "cost", "revenue", "sale"],
    warehouses: ["warehouse", "location", "city", "chennai", "mumbai", "delhi", "bengaluru", "stockout", "risk", "inventory", "stock"],
    inventory: ["inventory", "stock", "reorder", "warehouse", "product", "stockout", "risk", "depot", "hub"],
    sales: ["sales", "revenue", "sell", "sold", "transaction", "performance", "chennai", "mumbai", "delhi", "bengaluru", "month", "q1", "q2", "compare"],
    suppliers: ["supplier", "vendor", "delay", "order", "purchase", "lead time"],
    purchase_orders: ["purchase", "order", "supplier", "vendor", "delay", "delivery", "status"]
  };

  for (const tableSchema of activeSchema) {
    const tableName = tableSchema.table;
    const searchTerms = keywords[tableName] || [tableName, ...tableSchema.columns.map(c => c.name)];
    
    // Check if query contains table name or any associated keyword
    const isMatched = normalizedQuery.includes(tableName.toLowerCase()) || 
                      searchTerms.some(term => normalizedQuery.includes(term.toLowerCase()));
                      
    if (isMatched) {
      matchedTables.push(tableSchema);
    }
  }

  // Fallback: if no match, return all schemas (context limit allowing)
  if (matchedTables.length === 0) {
    return activeSchema;
  }
  return matchedTables;
}

// 2. SQL Generation Node (supports Grok API and Smart Local fallback)
export async function generateSQL(query, retrievedSchema, apiKey, errorContext = null) {
  if (apiKey) {
    // Call real xAI Grok API
    return await callGrokAPI(query, retrievedSchema, apiKey, errorContext);
  } else {
    // Smart local template engine with fallback logic
    return callLocalGenerator(query, errorContext);
  }
}

// xAI Grok API Fetch Integration
async function callGrokAPI(query, schema, apiKey, errorContext) {
  const schemaStr = JSON.stringify(schema, null, 2);
  
  const systemPrompt = `You are a Principal Data Architect and AI Agent specializing in SQL generation.
Generate an ANSI-compliant SELECT query for the given PostgreSQL schema.

Database Schema:
${schemaStr}

Rules:
1. ONLY return the raw SQL query. Do not wrap in markdown \`\`\`sql blocks. No explanations.
2. The query MUST be read-only (SELECT statements only). No updates, inserts, deletes, or alters.
3. Make sure to JOIN tables correctly using primary/foreign key mappings.
4. Ensure SQL syntax is completely correct.

${errorContext ? `PREVIOUS ERROR CONTEXT:\nThe query you generated previously: \`${errorContext.sql}\` failed with error: "${errorContext.error}".\nPlease self-correct this SQL query to resolve the error.` : ''}

Generate SQL query for user request: "${query}"`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        model: "grok-2-1212",
        temperature: 0
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Grok API returned an error.");
    }

    const data = await response.json();
    let sql = data.choices[0].message.content.trim();
    // Strip markdown code block wrappers if Grok returns them
    sql = sql.replace(/^```sql/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    return sql;
  } catch (err) {
    console.error("Grok API call failed, falling back to local seeder:", err);
    throw new Error(`Grok API Error: ${err.message}. Check your key or internet connection.`);
  }
}

// Smart Local SQL Generator (Rule-based NLP matching + self healing triggers)
function callLocalGenerator(query, retrievedSchema, errorContext) {
  const q = query.toLowerCase();

  // If there's an error context, simulate self-healing correction
  if (errorContext) {
    let correctedSql = errorContext.sql;
    // Common self-healing fixes
    if (errorContext.error.includes("Column 'warehouses.location'")) {
      correctedSql = correctedSql.replace("warehouses.location", "warehouses.name");
    } else if (errorContext.error.includes("location") && correctedSql.includes("sales.location")) {
      correctedSql = correctedSql.replace("sales.location", "warehouses.location");
    } else if (correctedSql.includes("STRFTIME")) {
      correctedSql = correctedSql.replace(/STRFTIME\('.+?',\s*sales\.sale_date\)/i, "sales.sale_date");
    }
    return correctedSql;
  }

  // Check if target is a custom uploaded table
  const isCustomTable = retrievedSchema && retrievedSchema.some(s => 
    !["products", "warehouses", "inventory", "sales", "suppliers", "purchase_orders"].includes(s.table)
  );

  if (isCustomTable) {
    const targetSchema = retrievedSchema.find(s => 
      !["products", "warehouses", "inventory", "sales", "suppliers", "purchase_orders"].includes(s.table)
    ) || retrievedSchema[0];
    
    const tableName = targetSchema.table;
    const columns = targetSchema.columns.map(c => c.name);
    const numericColumns = targetSchema.columns.filter(c => c.type === 'NUMBER' || c.type === 'INTEGER' || c.type === 'DECIMAL').map(c => c.name);
    const textColumns = targetSchema.columns.filter(c => c.type === 'VARCHAR' || c.type === 'TEXT' || c.type === 'STRING').map(c => c.name);

    // 1. Check for aggregations (average, sum, max, min, count)
    let aggFunc = "";
    let targetCol = "";
    
    if (q.includes("average") || q.includes("avg") || q.includes("mean")) {
      aggFunc = "AVG";
    } else if (q.includes("sum") || q.includes("total") || q.includes("add") || q.includes("revenue") || q.includes("sales")) {
      aggFunc = "SUM";
    } else if (q.includes("highest") || q.includes("max") || q.includes("maximum")) {
      aggFunc = "MAX";
    } else if (q.includes("lowest") || q.includes("min") || q.includes("minimum")) {
      aggFunc = "MIN";
    } else if (q.includes("count") || q.includes("number of") || q.includes("how many") || q.includes("total rows")) {
      aggFunc = "COUNT";
    }

    // Find if any numeric column is mentioned in the query
    if (aggFunc && aggFunc !== "COUNT") {
      targetCol = numericColumns.find(col => q.includes(col.toLowerCase())) || numericColumns[0];
    } else if (aggFunc === "COUNT") {
      targetCol = "*";
    }

    // 2. Check for group by (group by, by, each)
    let groupByCol = "";
    if (q.includes("group by") || q.includes("by") || q.includes("each") || q.includes("per")) {
      groupByCol = columns.find(col => q.includes(col.toLowerCase()) && col !== targetCol) || textColumns[0];
    }

    // 3. Construct dynamic query
    if (aggFunc && targetCol) {
      if (groupByCol) {
        return `SELECT ${groupByCol}, ${aggFunc}(${targetCol}) AS val FROM ${tableName} GROUP BY ${groupByCol} ORDER BY val DESC`;
      } else {
        return `SELECT ${aggFunc}(${targetCol}) AS val FROM ${tableName}`;
      }
    }

    // 4. Filters (e.g. where column = value or similar)
    for (const col of columns) {
      const colLower = col.toLowerCase();
      if (q.includes(colLower)) {
        const match = q.match(new RegExp(`${colLower}\\s+(?:is|=)\\s+['"]?([^'"]+)['"]?`, 'i'));
        if (match) {
          const val = match[1];
          if (!isNaN(Number(val))) {
            return `SELECT * FROM ${tableName} WHERE ${col} = ${val}`;
          } else {
            return `SELECT * FROM ${tableName} WHERE LOWER(${col}) = '${val.toLowerCase()}'`;
          }
        }
      }
    }

    // Default: SELECT first few columns
    return `SELECT * FROM ${tableName} LIMIT 50`;
  }

  // 1. Chennai sales drop query
  if (q.includes("chennai") && (q.includes("decrease") || q.includes("drop") || q.includes("sales") || q.includes("why"))) {
    return "SELECT sales.sale_date AS date, sales.revenue AS revenue, products.name AS product_name FROM sales JOIN warehouses ON sales.warehouse_id = warehouses.id JOIN products ON sales.product_id = products.id WHERE warehouses.location = 'Chennai' ORDER BY sales.sale_date ASC";
  }

  // 2. Top 10 products by revenue
  if (q.includes("top 10") || (q.includes("top") && q.includes("product") && q.includes("revenue"))) {
    return "SELECT products.name AS product_name, SUM(sales.revenue) AS total_revenue FROM sales JOIN products ON sales.product_id = products.id GROUP BY products.name ORDER BY total_revenue DESC LIMIT 10";
  }

  // 3. Stockout risk query
  if (q.includes("warehouse") && (q.includes("stockout") || q.includes("risk") || q.includes("highest"))) {
    // If we want a syntax error to trigger the self-healing pipeline demo, we can intentionally return an error-prone query if requested,
    // but let's return a correct query and support error triggers via general raw SQL playground.
    return "SELECT warehouses.name AS warehouse_name, products.name AS product_name, inventory.current_stock AS stock, inventory.reorder_point AS safety_level FROM inventory JOIN warehouses ON inventory.warehouse_id = warehouses.id JOIN products ON inventory.product_id = products.id WHERE inventory.current_stock <= inventory.reorder_point ORDER BY inventory.current_stock ASC";
  }

  // 4. Compare Q1 and Q2 sales performance
  if (q.includes("q1") || q.includes("q2") || q.includes("compare") && q.includes("performance")) {
    return "SELECT sales.sale_date AS date, sales.revenue AS revenue FROM sales ORDER BY date ASC";
  }

  // 5. Supplier caused delays
  if (q.includes("supplier") && (q.includes("delay") || q.includes("most"))) {
    return "SELECT suppliers.name AS supplier_name, SUM(purchase_orders.delay_days) AS total_delay_days, COUNT(purchase_orders.id) AS delayed_orders_count FROM purchase_orders JOIN suppliers ON purchase_orders.supplier_id = suppliers.id WHERE purchase_orders.delay_days > 0 OR purchase_orders.status = 'Delayed' GROUP BY suppliers.name ORDER BY total_delay_days DESC";
  }

  // General fallback parser
  if (q.includes("sales") && q.includes("revenue")) {
    return "SELECT SUM(sales.revenue) AS total_revenue FROM sales";
  }
  if (q.includes("product")) {
    return "SELECT name, price FROM products ORDER BY price DESC";
  }
  if (q.includes("supplier")) {
    return "SELECT name, base_lead_time FROM suppliers";
  }

  return "SELECT name, location FROM warehouses";
}

// 3. Insight & Visualizer Generator Node (supports Grok API and Local Generator)
export async function generateInsights(query, sql, data, apiKey, retrievedSchema) {
  if (apiKey) {
    return await callGrokInsightsAPI(query, sql, data, apiKey);
  } else {
    return callLocalInsightsGenerator(query, sql, data, retrievedSchema);
  }
}

// Call Grok API to generate advanced textual insights
async function callGrokInsightsAPI(query, sql, data, apiKey) {
  const dataStr = JSON.stringify(data.slice(0, 30), null, 2);
  const systemPrompt = `You are a Principal Data Analyst.
Analyze the following SQL query results and write a professional, highly analytical narrative summary explaining the key insights to business users.

User Question: "${query}"
Executed SQL: \`${sql}\`
Query Results (JSON):
${dataStr}

Requirements:
1. Focus on the 'why' behind the numbers. E.g., Chennai monsoon weather, specific supplier delay rates, item reorder limits.
2. Structure output cleanly.
3. Determine the best chart configuration to show this data. Suggest: 'line', 'bar', 'pie', or 'table'.
4. Provide the exact structure for charting.

Format your response as a JSON object with this exact keys structure:
{
  "summary": "Full analytical text summary (markdown format allowed)",
  "chartType": "bar" | "line" | "pie" | "table",
  "chartConfig": {
    "xAxisKey": "name_of_column_for_x_axis",
    "dataKeys": ["name_of_column_for_y_values"],
    "title": "Title of the chart"
  }
}`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt }
        ],
        model: "grok-2-1212",
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error("Grok Insights completion request failed.");
    }

    const resData = await response.json();
    return JSON.parse(resData.choices[0].message.content.trim());

  } catch (err) {
    console.error("Grok Insights failed, falling back to local insights:", err);
    return callLocalInsightsGenerator(query, sql, data);
  }
}

// Local Analytical Insights Engine
function callLocalInsightsGenerator(query, sql, data, retrievedSchema) {
  const q = query.toLowerCase();

  // Check if target is a custom table
  const isCustomTable = retrievedSchema && retrievedSchema.some(s => 
    !["products", "warehouses", "inventory", "sales", "suppliers", "purchase_orders"].includes(s.table)
  );

  if (isCustomTable) {
    const targetSchema = retrievedSchema.find(s => 
      !["products", "warehouses", "inventory", "sales", "suppliers", "purchase_orders"].includes(s.table)
    ) || retrievedSchema[0];
    const tableName = targetSchema.table;
    const keys = data.length > 0 ? Object.keys(data[0]) : [];
    
    // Auto-detect chart type and configuration
    let chartType = "table";
    let chartConfig = {
      xAxisKey: keys[0] || "",
      dataKeys: keys.slice(1),
      title: `Dataset Analysis: ${tableName}`
    };

    const hasAggregate = q.includes("sum") || q.includes("total") || q.includes("avg") || q.includes("average") || q.includes("count") || q.includes("highest") || q.includes("lowest");
    const hasGroupBy = q.includes("by") || q.includes("group") || q.includes("each") || q.includes("per");
    
    if (hasAggregate && hasGroupBy && keys.length >= 2) {
      chartType = "bar";
      const numericKey = keys.find(k => k !== keys[0] && typeof data[0][k] === 'number') || keys[1];
      const categoryKey = keys.find(k => k !== numericKey) || keys[0];

      chartConfig = {
        xAxisKey: categoryKey,
        dataKeys: [numericKey],
        title: `Aggregated values by ${categoryKey}`
      };
    }

    return {
      summary: `### Analysis Report: ${tableName}
Processed and successfully executed query \`${sql}\`.

* **Returned Row Count:** ${data.length} records.
* **Fields Analyzed:** ${keys.join(', ')}.

#### Observations:
The system processed your NLP query on the custom uploaded table **${tableName}**. The extracted rows display values corresponding to the dimensions selected. Review the visual chart generated below.`,
      chartType,
      chartConfig,
      processedData: data
    };
  }

  // 1. Chennai sales decrease
  if (q.includes("chennai") && (q.includes("decrease") || q.includes("drop") || q.includes("sales") || q.includes("why"))) {
    // Aggregate data for chart formatting
    // Group May sales vs April sales
    const monthlySales = { "2026-01": 0, "2026-02": 0, "2026-03": 0, "2026-04": 0, "2026-05": 0, "2026-06": 0 };
    data.forEach(item => {
      const month = item.date.substring(0, 7);
      if (monthlySales[month] !== undefined) {
        monthlySales[month] += item.revenue;
      }
    });

    const chartData = Object.keys(monthlySales).map(month => ({
      month,
      revenue: monthlySales[month]
    }));

    return {
      summary: `### Executive Analysis: Chennai Revenue Slump
Our diagnostic analysis reveals a critical **82.3% contraction in revenue** for the Chennai Main Hub during May 2026. 

#### Root Causes Identified:
1. **Monsoon Climate Disruption:** Localized torrential rainfall in Chennai flooded the logistics transport lanes, halting incoming supply lines for key enterprise products.
2. **Critical Product Stockouts:** 
   - **Gigabit Managed Switches** went out of stock entirely (\`stock = 0\`), preventing the fulfillment of ₹11,250 worth of open orders.
   - **ProNAS Storage Arrays** inventory fell to 1 unit, causing stock limits that delayed ₹18,000 in projected April transactions.
3. **Logistics Supplier Delays:** **LogiTrans India** (our sole logistics vendor for Chennai Hub) delayed 4 key shipments during the same period, leading to a complete breakdown in supplier lead time KPIs.

#### Action Items:
- Multi-source supply nodes immediately to reduce dependency on LogiTrans India.
- Increase safety stock buffer threshold (reorder point) for Networking and Storage categories in Southern regional hubs by 25%.`,
      chartType: "line",
      chartConfig: {
        xAxisKey: "month",
        dataKeys: ["revenue"],
        title: "Monthly Revenue Trend - Chennai Hub (2026)"
      },
      processedData: chartData
    };
  }

  // 2. Top 10 products by revenue
  if (q.includes("top 10") || (q.includes("top") && q.includes("product") && q.includes("revenue"))) {
    return {
      summary: `### Top 10 Products by Sales Revenue (Q1-Q2 2026)
This analysis highlights the product segments generating the highest gross revenue for the company:

1. **ProNAS Storage Array 16TB** leading at **₹91,800.00** revenue. This represents our highest-margin corporate hardware asset.
2. **Gigabit Managed Switch** following at **₹34,650.00** revenue, signaling robust enterprise networking demand.
3. **Enterprise Server Rack** generating **₹32,400.00** revenue.
4. **Wi-Fi 7 Enterprise AP** contributing **₹27,930.00**.

#### Business Summary:
The **Storage** and **Networking** categories drive over **82% of all sales volume**. We should focus marketing budgets and stock assurances on these core products to maximize return.`,
      chartType: "bar",
      chartConfig: {
        xAxisKey: "product_name",
        dataKeys: ["total_revenue"],
        title: "Product Revenue Analysis"
      },
      processedData: data
    };
  }

  // 3. Stockout risks
  if (q.includes("warehouse") && (q.includes("stockout") || q.includes("risk") || q.includes("highest"))) {
    // Group count of low stock items by warehouse
    const risks = {};
    data.forEach(item => {
      risks[item.warehouse_name] = (risks[item.warehouse_name] || 0) + 1;
    });

    const chartData = Object.keys(risks).map(name => ({
      warehouse: name,
      risk_items_count: risks[name]
    }));

    return {
      summary: `### Critical Inventory Warning: Stockout Vulnerabilities
A comparison of warehouses reveals that the **Chennai Main Hub** has the highest immediate stockout risk with **3 SKU lines** falling below safe reorder thresholds.

#### Vulnerability Log:
- **Gigabit Managed Switch:** 0 units in stock (Safety threshold: 12). Fulfillment halted.
- **Uninterruptible Power Supply (UPS):** 3 units in stock (Safety threshold: 8).
- **ProNAS Storage Array 16TB:** 1 unit in stock (Safety threshold: 5).

#### Regional Summary:
Bengaluru Tech Depot is also showing stock warning levels on **Industrial IoT Gateways** (2 units remaining against safety reorder mark of 10). Immediate reorders are recommended for these specific SKUs to avert product stockouts.`,
      chartType: "bar",
      chartConfig: {
        xAxisKey: "warehouse",
        dataKeys: ["risk_items_count"],
        title: "Stockout Warning Count by Warehouse"
      },
      processedData: chartData
    };
  }

  // 4. Compare Q1 and Q2 sales
  if (q.includes("q1") || q.includes("q2") || q.includes("compare") && q.includes("performance")) {
    const monthlySales = { "Q1": 0, "Q2": 0 };
    data.forEach(item => {
      const month = item.date.substring(5, 7);
      if (["01", "02", "03"].includes(month)) {
        monthlySales["Q1"] += item.revenue;
      } else if (["04", "05", "06"].includes(month)) {
        monthlySales["Q2"] += item.revenue;
      }
    });

    const chartData = [
      { quarter: "Q1 Performance", revenue: monthlySales["Q1"] },
      { quarter: "Q2 Performance", revenue: monthlySales["Q2"] }
    ];

    return {
      summary: `### Financial Summary: Q1 vs Q2 Performance (2026)
An aggregated review of revenues shows steady enterprise growth:

* **Q1 Total Sales:** **₹147,753.00** (covering Jan, Feb, Mar)
* **Q2 Total Sales:** **₹146,801.00** (covering Apr, May, Jun - including the Chennai flood hit)

#### Performance Insights:
- Despite a temporary supply-chain hit in Chennai in May, strong sales in the Mumbai and Delhi regions in April (₹44,385.00) and May (₹46,365.00) offset the regional dip.
- High-volume contract fulfillment for **Cat8 Cables** in Bengaluru during June added stability to Q2 margins.`,
      chartType: "pie",
      chartConfig: {
        xAxisKey: "quarter",
        dataKeys: ["revenue"],
        title: "Revenue Distribution: Q1 vs Q2 (2026)"
      },
      processedData: chartData
    };
  }

  // 5. Supplier delays
  if (q.includes("supplier") && (q.includes("delay") || q.includes("most"))) {
    return {
      summary: `### Supply Chain Risk: Vendor Fulfillment Performance
An evaluation of delivery lags highlights critical vendor exposure:

* **LogiTrans India:** **75 cumulative delay days** across **5 delayed orders**. This represents an average delay of **15.0 days per order** past contracted lead times.
* **Apex Electronix:** **2 delay days** across **2 orders** (average delay of 1.0 day).
* **OptiGlobe Cables / Innova Storage:** 0 days delayed (100% on-time fulfillment).

#### Recommendation:
**LogiTrans India** is currently causing the most supply delays, significantly increasing inventory stockout risks at our retail hubs. We advise shifting transit volume to other logisitics partners or imposing contractual SLA penalties.`,
      chartType: "bar",
      chartConfig: {
        xAxisKey: "supplier_name",
        dataKeys: ["total_delay_days"],
        title: "Cumulative Lead Time Delay Days by Supplier"
      },
      processedData: data
    };
  }

  // Default fallback visualization
  return {
    summary: `### SQL Query Result Summary
Successfully executed SQL query and retrieved **${data.length} records** from the database.
Check the tabular visualization below for exact fields and rows.`,
    chartType: "table",
    chartConfig: {
      xAxisKey: data.length > 0 ? Object.keys(data[0])[0] : "",
      dataKeys: data.length > 0 ? [Object.keys(data[0])[1]] : [],
      title: "Query Output Table"
    },
    processedData: data
  };
}

// 4. E2E Agent compiled pipeline wrapper pointing to Python Backend service
export async function runAgentPipeline(query, apiKey, updateProgressCallback, dbState, customSchema) {
  try {
    if (updateProgressCallback) {
      updateProgressCallback([
        { title: "Pipeline Inception", status: "running", detail: "Connecting to FastAPI agent workflow..." }
      ]);
    }

    const response = await fetch(`${API_BASE_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey || ""
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Backend query pipeline execution failed.");
    }

    const data = await response.json();

    if (updateProgressCallback && data.steps) {
      updateProgressCallback(data.steps);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      sql: data.sql,
      results: data.results,
      insights: data.insights,
      steps: data.steps
    };

  } catch (error) {
    if (updateProgressCallback) {
      updateProgressCallback([
        { title: "Pipeline Terminated", status: "error", detail: error.message }
      ]);
    }
    throw error;
  }
}
