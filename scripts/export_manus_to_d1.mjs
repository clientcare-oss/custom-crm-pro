import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const MANUS_URL = process.env.DATABASE_URL || '';
const OUTPUT_FILE = path.resolve('drizzle/d1_export.sql');

async function exportManusToD1() {
  console.log('Connecting to Manus TiDB...');
  const conn = await mysql.createConnection(MANUS_URL);
  
  const [tables] = await conn.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]).filter(name => !name.startsWith('__drizzle'));

  console.log(`Found ${tableNames.length} tables to export.`);

  let sqlOutput = `-- Cloudflare D1 Migration Dump from Manus TiDB\n`;
  sqlOutput += `-- Exported at: ${new Date().toISOString()}\n\n`;

  for (const tableName of tableNames) {
    console.log(`Exporting table: ${tableName}`);
    
    // Get table structure
    const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
    let createSql = createRow['Create Table'];

    // Convert MySQL DDL to SQLite DDL
    let sqliteSql = convertCreateToSqlite(createSql, tableName);
    
    sqlOutput += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sqlOutput += sqliteSql + `;\n\n`;

    // Fetch data rows
    const [rows] = await conn.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      console.log(`  Writing ${rows.length} rows for ${tableName}...`);
      
      const cols = Object.keys(rows[0]);
      const colList = cols.map(c => `\`${c}\``).join(', ');

      for (const row of rows) {
        const valList = cols.map(c => formatSqlValue(row[c])).join(', ');
        sqlOutput += `INSERT INTO \`${tableName}\` (${colList}) VALUES (${valList});\n`;
      }
      sqlOutput += `\n`;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, sqlOutput, 'utf8');
  console.log(`Successfully exported D1 migration script to ${OUTPUT_FILE}`);
  console.log(`Total file size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);

  await conn.end();
}

function convertCreateToSqlite(createSql, tableName) {
  let s = createSql;

  // Remove table options like ENGINE=InnoDB DEFAULT CHARSET=...
  s = s.replace(/\)\s*ENGINE=.*$/is, ')');

  // Convert int AUTO_INCREMENT to INTEGER PRIMARY KEY AUTOINCREMENT
  s = s.replace(/`id` int AUTO_INCREMENT NOT NULL/gi, '`id` INTEGER PRIMARY KEY AUTOINCREMENT');
  s = s.replace(/`id` int NOT NULL AUTO_INCREMENT/gi, '`id` INTEGER PRIMARY KEY AUTOINCREMENT');
  s = s.replace(/`id` bigint AUTO_INCREMENT NOT NULL/gi, '`id` INTEGER PRIMARY KEY AUTOINCREMENT');
  s = s.replace(/`id` bigint NOT NULL AUTO_INCREMENT/gi, '`id` INTEGER PRIMARY KEY AUTOINCREMENT');
  
  // Remove standalone CONSTRAINT `xxx_id` PRIMARY KEY(`id`)
  s = s.replace(/,\s*CONSTRAINT `[^`]+` PRIMARY KEY\s*\([^)]+\)/gi, '');
  s = s.replace(/,\s*PRIMARY KEY\s*\([^)]+\)/gi, '');

  // Convert MySQL data types to SQLite compatible types
  s = s.replace(/\bint\(\d+\)/gi, 'INTEGER');
  s = s.replace(/\bint\b/gi, 'INTEGER');
  s = s.replace(/\bbigint\b/gi, 'INTEGER');
  s = s.replace(/\btinyint\(\d+\)/gi, 'INTEGER');
  s = s.replace(/\btinyint\b/gi, 'INTEGER');
  s = s.replace(/\bdouble\b/gi, 'REAL');
  s = s.replace(/\bfloat\b/gi, 'REAL');
  s = s.replace(/\bdecimal\(\d+,\d+\)/gi, 'NUMERIC');
  s = s.replace(/\bvarchar\(\d+\)/gi, 'TEXT');
  s = s.replace(/\blongtext\b/gi, 'TEXT');
  s = s.replace(/\bmediumtext\b/gi, 'TEXT');
  s = s.replace(/\bdatetime\b/gi, 'TEXT');
  s = s.replace(/\btimestamp\b/gi, 'TEXT');
  s = s.replace(/enum\([^)]+\)/gi, 'TEXT');
  s = s.replace(/json/gi, 'TEXT');

  // Replace default values like (now()) or CURRENT_TIMESTAMP
  s = s.replace(/DEFAULT \(now\(\)\)/gi, "DEFAULT CURRENT_TIMESTAMP");
  s = s.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, "");

  // Remove KEY / INDEX constraints embedded in CREATE TABLE
  s = s.replace(/,\s*(UNIQUE\s+)?KEY `[^`]+` \([^)]+\)/gi, '');

  return s;
}

function formatSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    return `'${val.toISOString().replace('T', ' ').replace('Z', '')}'`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  // String escaping for SQLite
  return `'${String(val).replace(/'/g, "''")}'`;
}

exportManusToD1().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
