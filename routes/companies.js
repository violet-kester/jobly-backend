"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const Company = require("../models/company");
const { ensureAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");
const companySearchSchema = require("../schemas/companySearch.json");

const router = new express.Router();


/** POST / --- { company } => { company }
 *
 * AUTHORIZATION REQUIRED: admin.
 *
 * Creates a company with data.
 *
 * Input company data should be:
 * { handle, name, description, numEmployees, logoUrl }
 *
 * Returns created company data:
 * { company: { handle, name, description, numEmployees, logoUrl } }
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    companyNewSchema,
    {required: true}
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const company = await Company.create(req.body);
  return res.status(201).json({ company });
});

/** GET / --- => { companies: [ { ... }, { ... }, ...] }
 *
 * AUTHORIZATION REQUIRED: none.
 *
 * Gets all companies.
 *
 * Can filter on optional search filter keys:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 */

router.get("/", async function (req, res, next) {
  const q = req.query;

  // converts string nums from querystring to ints
  if (q.minEmployees !== undefined) q.minEmployees = +q.minEmployees;
  if (q.maxEmployees !== undefined) q.maxEmployees = +q.maxEmployees;

  const validator = jsonschema.validate(
    q,
    companySearchSchema,
    {required: true}
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const companies = await Company.findAll(q);
  return res.json({ companies });
});

/** GET /[handle] --- => { company }
 *
 * AUTHORIZATION REQUIRED: none.
 *
 * Gets company data by handle.
 *
 * Returns:
 * { company: { handle, name, description, numEmployees, logoUrl, jobs } }
 * - Where jobs is:
 *   [{ id, title, salary, equity }, ...]
 */

router.get("/:handle", async function (req, res, next) {
  const company = await Company.get(req.params.handle);
  return res.json({ company });
});

/** PATCH /[handle] --- { field1, field2, ... } => { company }
 *
 * AUTHORIZATION REQUIRED: admin.
 *
 * Patches company data.
 *
 * Input fields can be:
 * { name, description, numEmployees, logoUrl }
 *
 * Returns updated company data:
 * { company: { handle, name, description, numEmployees, logoUrl } }
 */

router.patch("/:handle", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    companyUpdateSchema,
    {required: true}
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const company = await Company.update(req.params.handle, req.body);
  return res.json({ company });
});

/** DELETE /[handle] --- => { deleted: handle }
 *
 * AUTHORIZATION REQUIRED: admin.
 *
 * Removes company by company handle.
 *
 * Returns:
 * { deleted: handle }
 */

router.delete("/:handle", ensureAdmin, async function (req, res, next) {
  await Company.remove(req.params.handle);
  return res.json({ deleted: req.params.handle });
});


module.exports = router;