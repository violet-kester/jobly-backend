"use strict";

/** Related functions for jobs. */

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError } = require("../expressError");


class Job {

  /** create({ title, salary, equity, companyHandle })
   *
   * Creates a job (from data), updates db, returns new job data.
   *
   * Input data object:
   * { title, salary, equity, companyHandle }

   * Returns:
   * { id, title, salary, equity, companyHandle }
   *
   * If company does not exist, throws NotFoundError.
   */

  static async create({ title, salary, equity, companyHandle }) {
    const companyPreCheck = await db.query(`
                SELECT handle
                FROM companies
                WHERE handle = $1`,
        [data.companyHandle]);
    const company = companyPreCheck.rows[0];

    if (!company) throw new NotFoundError(`No company: ${data.companyHandle}`);

    const result = await db.query(`
        INSERT INTO jobs (title,
                          salary,
                          equity,
                          company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"`, [
      title,
      salary,
      equity,
      companyHandle,
    ]);
    const job = result.rows[0];

    return job;
  }

  /** _filterWhereBuilder({ minSalary, hasEquity, title })
   *
   * Creates WHERE clause for filters,
   * to be used by functions that query with filters.
   *
   * Input searchFilters keys (all optional):
   * - minSalarysearchFilters
   * - hasEquity
   * - title (will find case-insensitive, partial matches)
   *
   * Returns: {
   *   where: "WHERE minSalary >= $1 AND title ILIKE $2",
   *   vals: [10000, '%Engineer%']
   * }
   */

  static _filterWhereBuilder({ minSalary, hasEquity, title }) {
    let whereParts = [];
    let vals = [];

    if (minSalary !== undefined) {
      vals.push(minSalary);
      whereParts.push(`salary >= $${vals.length}`);
    }

    if (hasEquity === true) {
      whereParts.push(`equity > 0`);
    }

    if (title !== undefined) {
      vals.push(`%${title}%`);
      whereParts.push(`title ILIKE $${vals.length}`);
    }

    const where = (whereParts.length > 0) ?
        "WHERE " + whereParts.join(" AND ")
        : "";

    return { where, vals };
  }

  /** findAll(searchFilters = {})
   *
   * Find all jobs (with optional filters).
   *
   * Input searchFilters keys (all optional):
   * - minSalary
   * - hasEquity (true returns only jobs with equity > 0, other values ignored)
   * - title (will find case-insensitive, partial matches)
   *
   * Returns:
   * [{ id, title, salary, equity, companyHandle, companyName }, ...]
   */

  static async findAll(searchFilters = {}) {
    const { minSalary, hasEquity, title } = searchFilters;

    const { where, vals } = this._filterWhereBuilder({
      minSalary, hasEquity, title,
    });

    const jobsRes = await db.query(`
        SELECT j.id,
               j.title,
               j.salary,
               j.equity,
               j.company_handle AS "companyHandle",
               c.name           AS "companyName"
        FROM jobs j
                 LEFT JOIN companies AS c ON c.handle = j.company_handle
            ${where}`, vals);

    return jobsRes.rows;
  }

  /** get(id)
   *
   * Given a job id, returns data about job.
   *
   * Returns:
   * { id, title, salary, equity, companyHandle, company }
   * - Where company is:
   *   { handle, name, description, numEmployees, logoUrl }
   *
   * If not found, throws NotFoundError.
   */

  static async get(id) {
    const jobRes = await db.query(`
        SELECT id,
               title,
               salary,
               equity,
               company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`, [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    const companiesRes = await db.query(`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        WHERE handle = $1`, [job.companyHandle]);

    delete job.companyHandle;
    job.company = companiesRes.rows[0];

    return job;
  }

  /** update(id, data)
   *
   * Updates job data.
   *
   * This is a "partial update."
   * It's fine if data doesn't contain all the fields.
   * Only changes provided fields.
   *
   * Input data object can include:
   * { title, salary, equity }
   *
   * Returns:
   * { id, title, salary, equity, companyHandle }
   *
   * If not found, throws NotFoundError.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE jobs
        SET ${setCols}
        WHERE id = ${idVarIdx}
        RETURNING id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** remove(id)
   *
   * Deletes given job from database.
   *
   * Returns: undefined.
   *
   * If not found, throws NotFoundError.
   */

  static async remove(id) {
    const result = await db.query(
        `DELETE
         FROM jobs
         WHERE id = $1
         RETURNING id`, [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}


module.exports = Job;