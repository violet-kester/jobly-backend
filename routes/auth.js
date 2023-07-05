"use strict";

/** Routes for authentication. */

const jsonschema = require("jsonschema");
const express = require("express");

const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const { BadRequestError } = require("../expressError");

const userAuthSchema = require("../schemas/userAuth.json");
const userRegisterSchema = require("../schemas/userRegister.json");

const router = new express.Router();


/** POST /auth/token --- { username, password } => { token }
 *
 * AUTHORIZATION REQUIRED: none.
 *
 * Generates JWT token with valid login credentials.
 *
 * Returns:
 * - JWT token which can be used to authenticate further requests.
 */

router.post("/token", async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    userAuthSchema,
    {required: true}
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const { username, password } = req.body;
  const user = await User.authenticate(username, password);
  const token = createToken(user);
  return res.json({ token });
});


/** POST /auth/register --- { user } => { token }
 *
 * AUTHORIZATION REQUIRED: none.
 *
 * Creates a new user with data.
 *
 * Input user data must include:
 * { username, password, firstName, lastName, email }
 *
 * Returns:
 * - JWT token which can be used to authenticate further requests.
 */

router.post("/register", async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    userRegisterSchema,
    {required: true}
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const newUser = await User.register({ ...req.body, isAdmin: false });
  const token = createToken(newUser);
  return res.status(201).json({ token });
});


module.exports = router;