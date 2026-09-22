/**
 * Validate and coerce request parts with zod schemas. Parsed values replace the raw
 * ones, so handlers only ever see clean, typed input.
 */
export const validate = (schemas) => (req, _res, next) => {
  if (schemas.params) req.params = schemas.params.parse(req.params);
  if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
  next();
};
