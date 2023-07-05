"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");


/** authenticateJWT(req, res, next) - authenticate user
 *
 * If a token was provided, verifies it.
 * If valid, stores the token payload on res.locals.
 * (Includes the username and isAdmin fields.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  const authHeader = req.headers?.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^[Bb]earer /, "").trim();

    try {
      res.locals.user = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      /* ignore invalid tokens (but don't store user) */
    }
  }
  return next();

}

/** ensureLoggedIn(req, res, next) - require log in
 *
 * If not logged in, raises Unauthorized error.
 */

function ensureLoggedIn(req, res, next) {
  if (res.locals.user?.username) return next();
  throw new UnauthorizedError();
}


/** ensureAdmin(req, res, next) - require admin
 *
 * If not admin, raises Unauthorized error.
 */

function ensureAdmin(req, res, next) {
  if (res.locals.user?.username && res.locals.user?.isAdmin === true) {
    return next();
  }
  throw new UnauthorizedError();

}

/** ensureCorrectUserOrAdmin(req, res, next) - ensure correct user/admin
 *
 * Ensures a valid token was provided
 * and that user matches username provided as route param.
 *
 * If not, raises Unauthorized error.
 */

function ensureCorrectUserOrAdmin(req, res, next) {
  const user = res.locals.user;
  const username = res.locals.user?.username;
  if (username && (username === req.params.username || user.isAdmin === true)) {
    return next();
  }

  throw new UnauthorizedError();
}


module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureCorrectUserOrAdmin,
};
