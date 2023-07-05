"use strict";

const { BadRequestError } = require("../expressError");

/** sqlForPartialUpdate(dataToUpdate, jsToSQL)
 *
 * Helper for making selective update queries.
 * Generates the SET clause of an SQL UPDATE statement.
 *
 * @param dataToUpdate - updated data
 * {Object} { firstName: 'Aliya', age: 32, ... }
 *
 * @param jsToSql - data fields mapped to db column names
 * {Object} { firstName: "first_name", age: "age" }
 *
 * @returns
 * {Object} { sqlSetCols, dataToUpdate }
 *
 * @example { firstName: 'Aliya', age: 32 } =>
 * { setCols: '"first_name"=$1, "age"=$2', values: ['Aliya', 32] }
 *
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // { firstName: 'Aliya', age: 32 } => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
