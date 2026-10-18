import test from "node:test";
import assert from "node:assert/strict";
import { validateRosterRows } from "../src/roster.mjs";
import readXlsxFile from "read-excel-file/node";
import { fileURLToPath } from "node:url";

test("roster preview preserves text IDs and flags numeric IDs, duplicates, and invalid rows", () => {
  const valid = validateRosterRows([
    ["Student ID", "Name"], ["0012", "Student 1"], ["A-2", "Student 2"]
  ]);
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.students[0].studentId, "0012");
  assert.deepEqual(valid.students[0], { studentId: "0012", name: "Student 1" });
  const invalid = validateRosterRows([
    ["Student ID", "Name"], [12, "Student 1"], ["12", "Student 2"], ["", ""]
  ]);
  assert.match(invalid.errors.join(" "), /numeric in Excel/);
  assert.match(invalid.errors.join(" "), /duplicate Student ID/);
  assert.equal(invalid.students.length, 2);
  assert.match(validateRosterRows([["ID", "Student Name"], ["1", "A"]]).errors.join(" "), /headers/);
});

test("first-sheet .xlsx parsing preserves a leading-zero text ID", async () => {
  const path = fileURLToPath(new URL("./fixtures/roster-leading-zero.xlsx", import.meta.url));
  const result = validateRosterRows(await readXlsxFile(path));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.students, [
    { studentId: "0012", name: "Student 1" },
    { studentId: "A-2", name: "Student 2" }
  ]);
});
