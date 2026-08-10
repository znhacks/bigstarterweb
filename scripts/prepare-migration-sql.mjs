import fs from "fs";
import path from "path";

const migrationsDir = "supabase/migrations";
const files = fs.readdirSync(migrationsDir).sort();

let combinedSql = `-- =========================================================================\n`;
combinedSql += `-- COMBINED MIGRATION SCRIPT FOR JURNALMENGAJAR SUPABASE PROJECT\n`;
combinedSql += `-- =========================================================================\n\n`;

for (const file of files) {
  if (file.endsWith(".sql")) {
    console.log(`Adding migration file: ${file}`);
    combinedSql += `-- -------------------------------------------------------------------------\n`;
    combinedSql += `-- FILE: ${file}\n`;
    combinedSql += `-- -------------------------------------------------------------------------\n`;
    combinedSql += fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    combinedSql += `\n\n`;
  }
}

const outputPath = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\8e687f69-440d-41da-94f2-50e15ca54b1f\\combined_migration_jurnalmengajar.sql";
fs.writeFileSync(outputPath, combinedSql, "utf-8");
console.log(`✅ Successfully generated combined SQL file: ${outputPath}`);
