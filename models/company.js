"use strict";

/** Related functions for companies. */

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { BadRequestError, NotFoundError } = require("../expressError");


class Company {

  /** create({ handle, name, description, numEmployees, logoUrl })
   *
   * Creates a company (from data), updates db, returns new company data.
   *
   * Input data object:
   * { handle, name, description, numEmployees, logoUrl }
   *
   * Returns:
   * { handle, name, description, numEmployees, logoUrl }
   *
   * If company already in database, throws BadRequestError.
   */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(`
        SELECT handle
        FROM companies
        WHERE handle = $1`, [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(`
                INSERT INTO companies (handle,
                                       name,
                                       description,
                                       num_employees,
                                       logo_url)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING
                    handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"`, [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** _filterWhereBuilder({ minEmployees, maxEmployees, nameLike })
   *
   * Creates WHERE clause for filters,
   * to be used by functions that query with filters.
   *
   * Input searchFilters keys (all optional):
   * - minEmployees
   * - maxEmployees
   * - nameLike (will find case-insensitive, partial matches)
   *
   * Returns: {
   *   where: 'WHERE num_employees >= $1 AND name ILIKE $2',
   *   vals: [100, '%Apple%']
   * }
   */

  static _filterWhereBuilder({ minEmployees, maxEmployees, nameLike }) {
    let whereParts = [];
    let vals = [];

    if (minEmployees !== undefined) {
      vals.push(minEmployees);
      whereParts.push(`num_employees >= $${vals.length}`);
    }

    if (maxEmployees !== undefined) {
      vals.push(maxEmployees);
      whereParts.push(`num_employees <= $${vals.length}`);
    }

    if (nameLike) {
      vals.push(`%${nameLike}%`);
      whereParts.push(`name ILIKE $${vals.length}`);
    }

    const where = (whereParts.length > 0) ?
        "WHERE " + whereParts.join(" AND ")
        : "";

    return { where, vals };
  }

  /** findAll(searchFilters = {})
   *
   * Finds all companies (with optional filters).
   *
   * Input searchFilters keys (all optional):
   * - minEmployees
   * - maxEmployees
   * - nameLike (will find case-insensitive, partial matches)
   *
   * Returns:
   * [{ handle, name, description, numEmployees, logoUrl }, ...]
   */

  static async findAll(searchFilters = {}) {
    const { minEmployees, maxEmployees, nameLike } = searchFilters;

    if (minEmployees > maxEmployees) {
      throw new BadRequestError("Min employees cannot be greater than max");
    }

    const { where, vals } = this._filterWhereBuilder({
      minEmployees, maxEmployees, nameLike,
    });

    const companiesRes = await db.query(`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies ${where}
        ORDER BY name`, vals);
    return companiesRes.rows;
  }

  /** get(handle)
   *
   * Given a company handle, returns data about company.
   *
   * Returns:
   * { handle, name, description, numEmployees, logoUrl, jobs }
   * - Where jobs is an array of job objects:
   *   [{ id, title, salary, equity }, ...]
   *
   * If not found, throws NotFoundError.
   */

  static async get(handle) {
    const companyRes = await db.query(`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        WHERE handle = $1`, [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobsRes = await db.query(`
        SELECT id, title, salary, equity
        FROM jobs
        WHERE company_handle = $1
        ORDER BY id`, [handle],
    );

    company.jobs = jobsRes.rows;

    return company;
  }

  /** update(handle, data)
   *
   * Updates company data.
   *
   * This is a "partial update."
   * It's fine if data doesn't contain all the fields.
   * Only changes provided fields.
   *
   * Input data object can include:
   * { name, description, numEmployees, logoUrl }
   *
   * Returns:
   * { handle, name, description, numEmployees, logoUrl }
   *
   * If not found, throws NotFoundError.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE companies
        SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING
            handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** remove(handle)
   *
   * Deletes given company from database.
   *
   * Returns: undefined
   *
   * If not found, throws NotFoundError.
   */

  static async remove(handle) {
    const result = await db.query(`
        DELETE
        FROM companies
        WHERE handle = $1
        RETURNING handle`, [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;