const { badRequest } = require("../lib/http");

/** validate(schema) parses req.body with a zod schema and replaces it with the clean result. */
const validate = (schema, where = "body") => (req, _res, next) => {
  const result = schema.safeParse(req[where] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    throw badRequest(details[0] ? `${details[0].field ? details[0].field + ": " : ""}${details[0].message}` : "Invalid input", details);
  }
  if (where === "body") req.body = result.data;
  else req.valid = result.data;
  next();
};

module.exports = { validate };
