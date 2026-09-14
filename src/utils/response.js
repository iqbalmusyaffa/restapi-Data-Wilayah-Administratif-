/**
 * Helper untuk format response JSON standar
 */

function successResponse(res, data, message = 'Berhasil mengambil data', statusCode = 200, meta = null) {
  const response = {
    success: true,
    message,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

function paginatedResponse(res, data, total, page, limit, message = 'Berhasil mengambil data list') {
  const totalPages = Math.ceil(total / limit);
  
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}

function errorResponse(res, message = 'Terjadi kesalahan pada server', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  successResponse,
  paginatedResponse,
  errorResponse
};
