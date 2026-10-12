import readXlsxFile from "read-excel-file";

export function validateRosterRows(rows) {
  const errors = [];
  if (!Array.isArray(rows) || rows.length < 2) errors.push("The first sheet needs headers and at least one student.");
  const header = (rows?.[0] || []).map(value => String(value ?? "").trim().toLowerCase());
  const idColumn = header.indexOf("student id");
  const nameColumn = header.indexOf("name");
  if (idColumn < 0 || nameColumn < 0) errors.push('The first row must include "Student ID" and "Name" headers.');
  const students = [];
  const seen = new Set();
  for (let index = 1; index < (rows?.length || 0); index++) {
    if (idColumn < 0 || nameColumn < 0) break;
    const row = rows[index];
    if (!row?.some(value => value !== null && value !== "")) continue;
    const rawId = row[idColumn];
    const studentId = String(rawId ?? "").trim();
    const name = String(row[nameColumn] ?? "").trim();
    const line = index + 1;
    if (typeof rawId === "number") errors.push(`Row ${line}: Student ID is numeric in Excel; check any lost leading zero and format it as text.`);
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9 _-]{0,38}[A-Za-z0-9])?$/.test(studentId)) errors.push(`Row ${line}: invalid or blank Student ID.`);
    if (!name || name.length > 100 || /[\r\n<>]/.test(name)) errors.push(`Row ${line}: invalid or blank Name.`);
    if (seen.has(studentId.toLowerCase())) errors.push(`Row ${line}: duplicate Student ID ${studentId}.`);
    seen.add(studentId.toLowerCase());
    students.push({ studentId, name });
  }
  if (students.length > 100) errors.push("A class can contain at most 100 students.");
  if (!students.length) errors.push("No student rows found.");
  return { students, errors };
}

export async function readRosterFile(file) {
  if (!file?.name?.toLowerCase().endsWith(".xlsx")) throw new Error("Select an .xlsx workbook.");
  if (file.size > 2_000_000) throw new Error("The workbook must be 2 MB or smaller.");
  return validateRosterRows(await readXlsxFile(file));
}
