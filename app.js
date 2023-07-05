"use strict";

/** Jobly - Express app */

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { authenticateJWT } = require("./middleware/auth");
const { NotFoundError } = require("./expressError");
const authRoutes = require("./routes/auth");
const companiesRoutes = require("./routes/companies");
const usersRoutes = require("./routes/users");
const jobsRoutes = require("./routes/jobs");

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan("tiny"));
app.use(authenticateJWT);

app.use("/auth", authRoutes);
app.use("/companies", companiesRoutes);
app.use("/users", usersRoutes);
app.use("/jobs", jobsRoutes);


/** Handles 404 errors - matches everything */

app.use(function (req, res, next) {
  throw new NotFoundError();
});

/** Generic error handler for unhandled errors */

app.use(function (err, req, res, next) {
  if (process.env.NODE_ENV !== "test") console.error(err.stack);
  const status = err.status || 500;
  const message = err.message;

  return res.status(status).json({
    error: { message, status },
  });
});

module.exports = app;