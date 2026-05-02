export const sendSuccess = (res, data, statusCode = 200, meta = null) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

export const sendCreated = (res, data, meta = null) => sendSuccess(res, data, 201, meta);

export const sendPaginated = (res, data, { total, page, limit }) =>
  sendSuccess(res, data, 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
