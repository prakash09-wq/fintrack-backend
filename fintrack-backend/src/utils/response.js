const ok = (res, data, msg = "Success", status = 200) =>
  res.status(status).json({ success: true, message: msg, data });

const err = (res, msg = "Internal server error", status = 500, errors = null) =>
  res.status(status).json({ success: false, message: msg, ...(errors && { errors }) });

const notFound = (res, msg = "Resource not found") => err(res, msg, 404);
const badReq   = (res, msg = "Bad request", errors = null) => err(res, msg, 400, errors);
const unauth   = (res, msg = "Unauthorized") => err(res, msg, 401);
const forbidden= (res, msg = "Forbidden") => err(res, msg, 403);

module.exports = { ok, err, notFound, badReq, unauth, forbidden };
