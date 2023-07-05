"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const Job = require("../models/job");
const { ensureAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearch.json");

const router = express.Router({ mergeParams: true });


/** POST / --- { job } => { job }
 *
 * AUTHORIZATION REQUIRED: admin.
 *
 * Creates a job with data.
 *
 * Input job data should be:
 * { title, salary, equity, companyHandle }
 *
 * Returns created job data:
 * { id, title, salary, equity, companyHandle }
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    jobNewSchema,
    {required: true}
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.create(req.body);
  return res.status(201).json({ job });
});

/** GET / --- => { jobs: [ { ... }, { ... }, ...] }
 *
 * AUTHORIZATION REQUIRED: none.
 *
 * Can filter on optional search filter keys:
 * - minSalary
 * - hasEquity (true returns only jobs with equity > 0)
 * - title (will find case-insensitive, partial matches)
 *
 * Returns:
 * { jobs: [ { id, title, salary, equity, companyHandle, companyName }, ...] }
 */

router.get("/", async function (req, res, next) {
  const q = req.query;

  // converts string data from querystring to int/bool
  if (q.minSalary !== undefined) q.minSalary = +q.minSalary;
  q.hasEquity = q.hasEquity === "true";

  const validator = jsonschema.validate(
    q,
    jobSearchSchema,
    {required: true}
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const jobs = await Job.findAll(q);
  return res.json({ jobs });
});

/** GET /[jobId] --- => { job }
 *
 * AUTHORIZATION REQUIRED: none.
 *
 * Gets job data by id.
 *
 * Returns:
 * { id, title, salary, equity, company }
 * - Where company is:
 *   { handle, name, description, numEmployees, logoUrl }
 */

router.get("/:id", async function (req, res, next) {
  const job = await Job.get(req.params.id);
  return res.json({ job });
});

/** PATCH /[jobId] --- { field1, field2, ... } => { job }
 *
 * AUTHORIZATION REQUIRED: admin.
 *
 * Patches job data.
 *
 * Input fields can be:
 * { title, salary, equity }
 *
 * Returns updated job data:
 * { id, title, salary, equity, companyHandle }
 */

router.patch("/:id", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    jobUpdateSchema,
    {required: true}
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.update(req.params.id, req.body);
  return res.json({ job });
});

/** DELETE /[handle] --- => { deleted: id }
 *
 * AUTHORIZATION REQUIRED: admin.
 *
 * Removes job by job id.
 *
 * Returns:
 * { deleted: id }
 */

router.delete("/:id", ensureAdmin, async function (req, res, next) {
  await Job.remove(req.params.id);
  return res.json({ deleted: +req.params.id });
});


module.exports = router;
