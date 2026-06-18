// A client-side SQL parser and query execution engine in JavaScript.
// Supports: SELECT, JOIN, WHERE, GROUP BY, ORDER BY, LIMIT, and Aggregations (SUM, AVG, COUNT, MIN, MAX).

import { initialTables } from './db.js';

export function executeSQL(sqlQuery, dbState = initialTables) {
  try {
    // 1. Clean the SQL query
    let query = sqlQuery.trim().replace(/\s+/g, ' ').replace(/;$/, '');
    
    // Safety check: Enforce read-only access
    if (!query.toUpperCase().startsWith('SELECT')) {
      throw new Error("Security Violation: Only SELECT queries are permitted for safety.");
    }

    // 2. Parse basic elements using RegExp
    // We parse: SELECT {cols} FROM {table} [JOIN {t2} ON {cond}]* [WHERE {cond}] [GROUP BY {cols}] [ORDER BY {cols}] [LIMIT {num}]
    const selectRegex = /^SELECT\s+(.+?)\s+FROM\s+(\w+)(.*)$/i;
    const match = query.match(selectRegex);
    if (!match) {
      throw new Error("SQL Syntax Error: Could not parse SELECT statement. Please check your syntax.");
    }

    const selectPart = match[1].trim();
    const primaryTable = match[2].trim().toLowerCase();
    const remainingPart = match[3].trim();

    if (!dbState[primaryTable]) {
      throw new Error(`SQL Execution Error: Table '${primaryTable}' does not exist in the database.`);
    }

    // Parse clauses
    let joins = [];
    let whereClause = null;
    let groupByClause = null;
    let orderByClause = null;
    let limitClause = null;

    let rest = remainingPart;

    // Parse JOINS (could be multiple)
    const joinRegex = /^(?:LEFT\s+|INNER\s+|RIGHT\s+)?JOIN\s+(\w+)\s+ON\s+([\w\.]+)\s*=\s*([\w\.]+)(.*)$/i;
    let joinMatch;
    while ((joinMatch = rest.match(joinRegex))) {
      joins.push({
        table: joinMatch[1].trim().toLowerCase(),
        key1: joinMatch[2].trim(),
        key2: joinMatch[3].trim()
      });
      rest = joinMatch[4].trim();
    }

    // Parse WHERE
    const whereMatch = rest.match(/^WHERE\s+(.+?)(?=\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      whereClause = whereMatch[1].trim();
    }

    // Parse GROUP BY
    const groupMatch = rest.match(/GROUP\s+BY\s+(.+?)(?=\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (groupMatch) {
      groupByClause = groupMatch[1].trim();
    }

    // Parse ORDER BY
    const orderMatch = rest.match(/ORDER\s+BY\s+(.+?)(?=\s+LIMIT|$)/i);
    if (orderMatch) {
      orderByClause = orderMatch[1].trim();
    }

    // Parse LIMIT
    const limitMatch = rest.match(/LIMIT\s+(\d+)$/i);
    if (limitMatch) {
      limitClause = parseInt(limitMatch[1].trim(), 10);
    }

    // 3. Execution: Load primary table data
    let dataset = dbState[primaryTable].map(row => {
      // Create namespace objects to prevent collisions: e.g. { "sales.id": 1, "sales.quantity": 2 }
      const namespacedRow = {};
      for (const key in row) {
        namespacedRow[`${primaryTable}.${key}`] = row[key];
        namespacedRow[key] = row[key]; // Keep original as fallback
      }
      return namespacedRow;
    });

    // 4. Execution: Perform Joins
    for (const join of joins) {
      const joinTable = join.table;
      if (!dbState[joinTable]) {
        throw new Error(`SQL Execution Error: Joined table '${joinTable}' does not exist.`);
      }

      const joinedDataset = [];
      const joinTableData = dbState[joinTable];

      for (const row1 of dataset) {
        for (const r2 of joinTableData) {
          const row2 = {};
          for (const key in r2) {
            row2[`${joinTable}.${key}`] = r2[key];
            row2[key] = r2[key];
          }

          // Check join condition: e.g. sales.warehouse_id = warehouses.id
          const val1 = row1[join.key1] !== undefined ? row1[join.key1] : row1[join.key1.split('.')[1]];
          const val2 = row2[join.key2] !== undefined ? row2[join.key2] : row2[join.key2.split('.')[1]];

          if (val1 !== undefined && val2 !== undefined && val1 === val2) {
            joinedDataset.push({ ...row1, ...row2 });
          }
        }
      }
      dataset = joinedDataset;
    }

    // 5. Execution: Filter rows via WHERE clause
    if (whereClause) {
      dataset = dataset.filter(row => {
        return evaluateWhere(whereClause, row);
      });
    }

    // 6. Execution: Process GROUP BY and SELECT columns/aggregations
    // Parse SELECT columns into structured format: e.g., "products.name AS product_name"
    const selectFields = parseSelectFields(selectPart);

    let result = [];
    if (groupByClause) {
      // Group rows
      const groupColumns = groupByClause.split(',').map(s => s.trim());
      const groups = {};

      for (const row of dataset) {
        const keyParts = groupColumns.map(col => {
          const val = row[col] !== undefined ? row[col] : row[col.split('.')[1]];
          if (val === undefined) {
            // Self-healing: throw error that group by column is invalid
            throw new Error(`SQL Execution Error: Column '${col}' in GROUP BY clause is invalid or does not exist.`);
          }
          return String(val);
        });
        const groupKey = keyParts.join('|||');

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(row);
      }

      // Compute aggregates for each group
      for (const groupKey in groups) {
        const groupRows = groups[groupKey];
        const representativeRow = groupRows[0];
        const resultRow = {};

        for (const field of selectFields) {
          if (field.isAggregate) {
            resultRow[field.alias] = computeAggregate(field.aggType, field.aggCol, groupRows);
          } else {
            const rawVal = representativeRow[field.col] !== undefined ? representativeRow[field.col] : representativeRow[field.col.split('.')[1]];
            resultRow[field.alias] = rawVal;
          }
        }
        result.push(resultRow);
      }
    } else {
      // Check if there are any aggregate fields in select (e.g. SELECT SUM(revenue) FROM sales)
      const hasAggregate = selectFields.some(f => f.isAggregate);
      if (hasAggregate) {
        // Aggregate entire dataset into one row
        const resultRow = {};
        for (const field of selectFields) {
          if (field.isAggregate) {
            resultRow[field.alias] = computeAggregate(field.aggType, field.aggCol, dataset);
          } else {
            // SQLite/MySQL behavior: take first row or null
            const firstRow = dataset[0] || {};
            resultRow[field.alias] = firstRow[field.col] || null;
          }
        }
        result.push(resultRow);
      } else {
        // Plain SELECT projection
        for (const row of dataset) {
          const resultRow = {};
          for (const field of selectFields) {
            const val = row[field.col] !== undefined ? row[field.col] : row[field.col.split('.')[1]];
            resultRow[field.alias] = val === undefined ? null : val;
          }
          result.push(resultRow);
        }
      }
    }

    // 7. Execution: ORDER BY sorting
    if (orderByClause) {
      const orderParts = orderByClause.split(',').map(s => s.trim());
      // Sort priority based on ORDER BY columns
      result.sort((a, b) => {
        for (const part of orderParts) {
          const match = part.match(/^([\w\.]+)\s*(ASC|DESC)?$/i);
          if (!match) continue;

          const col = match[1].trim();
          const direction = (match[2] || 'ASC').toUpperCase();

          // Search in aliases first, then columns
          let valA = a[col] !== undefined ? a[col] : a[col.split('.')[1]];
          let valB = b[col] !== undefined ? b[col] : b[col.split('.')[1]];

          if (valA === undefined) valA = a[col];
          if (valB === undefined) valB = b[col];

          if (valA == null) return direction === 'ASC' ? -1 : 1;
          if (valB == null) return direction === 'ASC' ? 1 : -1;

          if (valA < valB) return direction === 'ASC' ? -1 : 1;
          if (valA > valB) return direction === 'ASC' ? 1 : -1;
        }
        return 0;
      });
    }

    // 8. Execution: LIMIT constraints
    if (limitClause !== null) {
      result = result.slice(0, limitClause);
    }

    return {
      success: true,
      query: sqlQuery,
      rowCount: result.length,
      data: result,
      error: null
    };

  } catch (error) {
    return {
      success: false,
      query: sqlQuery,
      rowCount: 0,
      data: [],
      error: error.message
    };
  }
}

// Helpers for SELECT extraction
function parseSelectFields(selectText) {
  // Split columns by comma, taking care not to split commas inside parentheses (e.g. SUM(cost, price))
  const fields = [];
  let currentField = '';
  let parenDepth = 0;

  for (let i = 0; i < selectText.length; i++) {
    const char = selectText[i];
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;

    if (char === ',' && parenDepth === 0) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField.trim()) {
    fields.push(currentField.trim());
  }

  return fields.map(field => {
    // Check for alias: e.g. "expression AS alias"
    let expression = field;
    let alias = field;

    const aliasMatch = field.match(/^(.+?)\s+AS\s+([\w`"]+)$/i);
    if (aliasMatch) {
      expression = aliasMatch[1].trim();
      alias = aliasMatch[2].trim().replace(/[`"]/g, '');
    }

    // Check for aggregation
    const aggMatch = expression.match(/^(SUM|AVG|COUNT|MIN|MAX)\((.+?)\)$/i);
    if (aggMatch) {
      return {
        col: expression,
        alias: alias || expression,
        isAggregate: true,
        aggType: aggMatch[1].toUpperCase(),
        aggCol: aggMatch[2].trim()
      };
    }

    return {
      col: expression.toLowerCase(),
      alias: alias.replace(/[\w_]+\./g, '') || expression, // strip prefix for clean JSON keys
      isAggregate: false
    };
  });
}

// Helpers for Aggregations
function computeAggregate(type, column, rows) {
  if (rows.length === 0) return type === 'COUNT' ? 0 : null;

  const getVal = (row) => {
    if (column === '*') return 1;
    // Find column in namespaces
    const val = row[column] !== undefined ? row[column] : row[column.split('.')[1]];
    return val !== undefined ? Number(val) : 0;
  };

  switch (type) {
    case 'SUM':
      return rows.reduce((sum, r) => sum + getVal(r), 0);
    case 'AVG':
      const sum = rows.reduce((sum, r) => sum + getVal(r), 0);
      return sum / rows.length;
    case 'COUNT':
      if (column === '*') return rows.length;
      return rows.filter(r => {
        const val = r[column] !== undefined ? r[column] : r[column.split('.')[1]];
        return val !== undefined && val !== null;
      }).length;
    case 'MIN':
      return Math.min(...rows.map(r => getVal(r)));
    case 'MAX':
      return Math.max(...rows.map(r => getVal(r)));
    default:
      return null;
  }
}

// Helpers for WHERE evaluations
function evaluateWhere(whereText, row) {
  // Support compound OR / AND by replacing them and evaluating in sections
  // Let's support simple single or binary conditions first
  // Standard simple conditions: e.g. location = 'Chennai' or current_stock <= reorder_point
  
  // Replace SQL operators with JS equivalents
  let condition = whereText;

  // Resolve column names in where clause to their actual namespaced row values
  // e.g. "location = 'Chennai'" -> we replace "location" with the value of row["location"] or row["warehouses.location"]
  // Matches variables (letters, underscores, dots) that are not inside quotes
  const parts = condition.split(/(\s+AND\s+|\s+OR\s+)/i);

  const evaluatedParts = parts.map(part => {
    const trimmed = part.trim();
    if (trimmed.toUpperCase() === 'AND') return ' && ';
    if (trimmed.toUpperCase() === 'OR') return ' || ';

    // Parse comparison: e.g., "warehouses.location = 'Chennai'" or "current_stock <= reorder_point"
    const compRegex = /^([\w\.]+)\s*(=|!=|<>|>|<|>=|<=|LIKE|IS NULL|IS NOT NULL)\s*(.+)$/i;
    const match = trimmed.match(compRegex);
    if (!match) {
      // Check if it is a boolean column or constant
      return 'true';
    }

    const col = match[1].trim();
    let op = match[2].trim().toUpperCase();
    let val = match[3].trim();

    // Fetch column value
    let colVal = row[col] !== undefined ? row[col] : row[col.split('.')[1]];
    if (colVal === undefined) {
      // Try lowercase check
      colVal = row[col.toLowerCase()] !== undefined ? row[col.toLowerCase()] : row[col.toLowerCase().split('.')[1]];
    }

    if (colVal === undefined) {
      throw new Error(`SQL Execution Error: Column '${col}' in WHERE clause is invalid or does not exist.`);
    }

    // Parse value
    let compareVal;
    if (val.toUpperCase() === 'NULL') {
      compareVal = null;
    } else if (val.startsWith("'") && val.endsWith("'")) {
      compareVal = val.slice(1, -1);
    } else if (val.startsWith('"') && val.endsWith('"')) {
      compareVal = val.slice(1, -1);
    } else {
      // Check if it's a numeric constant or a second column name
      if (!isNaN(val)) {
        compareVal = Number(val);
      } else {
        // Second column reference
        compareVal = row[val] !== undefined ? row[val] : row[val.split('.')[1]];
        if (compareVal === undefined) {
          throw new Error(`SQL Execution Error: Column reference '${val}' in WHERE clause is invalid.`);
        }
      }
    }

    if (op === '=') op = '===';
    if (op === '<>') op = '!==';
    if (op === '!=') op = '!==';

    if (op === '===') return colVal === compareVal;
    if (op === '!==') return colVal !== compareVal;
    if (op === '>') return colVal > compareVal;
    if (op === '<') return colVal < compareVal;
    if (op === '>=') return colVal >= compareVal;
    if (op === '<=') return colVal <= compareVal;
    
    if (op === 'LIKE') {
      const regexStr = '^' + compareVal.replace(/%/g, '.*').replace(/_/g, '.') + '$';
      const regex = new RegExp(regexStr, 'i');
      return regex.test(String(colVal));
    }
    
    if (op === 'IS NULL') return colVal === null || colVal === undefined;
    if (op === 'IS NOT NULL') return colVal !== null && colVal !== undefined;

    return false;
  });

  // Safe evaluation of the generated boolean string
  return evaluateBooleanParts(evaluatedParts);
}

function evaluateBooleanParts(parts) {
  if (parts.length === 0) return true;
  
  // Pass 1: Evaluate all ' && ' operations (AND has higher precedence)
  const step1 = [];
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i];
    if (item === ' && ') {
      const left = step1.pop();
      const right = parts[++i];
      step1.push(left && right);
    } else {
      step1.push(item);
    }
  }

  // Pass 2: Evaluate all ' || ' operations (OR has lower precedence)
  let result = step1[0];
  for (let i = 1; i < step1.length; i += 2) {
    const op = step1[i];
    const right = step1[i + 1];
    if (op === ' || ') {
      result = result || right;
    }
  }
  return result;
}
