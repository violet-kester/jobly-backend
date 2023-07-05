"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");
const express = require("express");

const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const { ensureCorrectUserOrAdmin, ensureAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");

const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();


/** POST / --- { user }  => { user, token }
 *
 * AUTHORIZATION REQUIRED: admin.
 *
 * Creates a user with data.
 *
 * Note:
 * - This is not the registration endpoint.
 * - This is only for admin users to add new users.
 * - The new user being added can be an admin.
 *
 * Returns new user data and an authentication token:
 * { user: { username, firstName, lastName, email, isAdmin }, token }
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
      req.body,
      userNewSchema,
      { required: true },
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const user = await User.register(req.body);
  const token = createToken(user);
  return res.status(201).json({ user, token });
});

/** GET / --- => { users: [ { ... }, { ... }, ...] }
 *
 * AUTHORIZATION REQUIRED: admin.
 *
 * Gets all users.
 *
 * Returns:
 * { users: [ {username, firstName, lastName, email }, ... ] }
 */

router.get("/", ensureAdmin, async function (req, res, next) {
  const users = await User.findAll();
  return res.json({ users });
});

/** GET /[username] --- => { user }
 *
 * AUTHORIZATION REQUIRED: admin or same user.
 *
 * Gets user data by username.
 *
 * Returns:
 * { username, firstName, lastName, isAdmin, jobs }
 * - Where jobs is:
 *   { id, title, companyHandle, companyName, state }
 */

router.get("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  const user = await User.get(req.params.username);
  return res.json({ user });
});

/** PATCH /[username] --- { field1, field2, ... } => { user }
 *
 * AUTHORIZATION REQUIRED: admin or same user.
 *
 * Data can include:
 * { firstName, lastName, password, email }
 *
 * Returns updated user data:
 * { username, firstName, lastName, email, isAdmin }
 */

router.patch("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
      req.body,
      userUpdateSchema,
      { required: true },
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const user = await User.update(req.params.username, req.body);
  return res.json({ user });
});

/** DELETE /[username] --- => { deleted: username }
 *
 * AUTHORIZATION REQUIRED: admin or same user.
 *
 * Removes user by username.
 *
 * Returns:
 * { deleted: username }
 */

router.delete("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  await User.remove(req.params.username);
  return res.json({ deleted: req.params.username });
});

/** POST /[username]/jobs/[id] --- { state } => { application }
 *
 * AUTHORIZATION REQUIRED: admin or same user.
 *
 * TODO: Input data:
 *
 * Applies a user to a job by username and job id.
 *
 * Returns:
 * { applied: jobId }
 */

router.post("/:username/jobs/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
  const jobId = +req.params.id;
  await User.applyToJob(req.params.username, jobId);
  return res.json({ applied: jobId });
});


module.exports = router;