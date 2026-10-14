const { errorResponse } = require('../common/dtos/responseDto');

const notFound = (req, res, _next) => {
  console.warn(`[HTTP 404] ROUTE NOT FOUND: ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()} FROM IP: ${req.ip}`);
  return errorResponse(res, 404, `Route Not Found - ${req.originalUrl}`);
};

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';

  // Log unhandled application or database exceptions in UPPERCASE
  console.error(`[SERVER ERROR] UNHANDLED EXCEPTION ON ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()}: ${message.toUpperCase()}`);

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Resource not found or invalid ID format';
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered for ${field}`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  }

  // Hide internal database stack trace in production
  const responseData = process.env.NODE_ENV === 'production' ? null : { stack: err.stack };

  return res.status(statusCode).json({
    success: false,
    message,
    ...(responseData && { debug: responseData }),
  });
};

module.exports = { notFound, errorHandler };
