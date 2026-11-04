/**
 * @file response.utils.js
 * @description Standardized API Response Formatter & Envelope Wrapper.
 */

class ApiResponse {
  /**
   * Standard Success Response Envelope
   * Supports both object-based options and positional parameters
   */
  static success(
    res,
    messageOrOptions = 'Success',
    defaultData = null,
    defaultStatusCode = 200,
    defaultPagination = null
  ) {
    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      const {
        message = 'Success',
        data = null,
        statusCode = 200,
        pagination = null
      } = messageOrOptions;

      return res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data,
        ...(pagination && { pagination }),
        timestamp: new Date().toISOString()
      });
    }

    return res.status(defaultStatusCode).json({
      success: true,
      statusCode: defaultStatusCode,
      message: messageOrOptions,
      data: defaultData,
      ...(defaultPagination && { pagination: defaultPagination }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Standard Error Response Helper
   */
  static error(res, errorOrMessage = 'Internal Server Error', errors = null, statusCode = 500) {
    const message =
      typeof errorOrMessage === 'string'
        ? errorOrMessage
        : errorOrMessage?.message || 'Internal Server Error';

    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Bad Request Helper
   */
  static badRequest(res, messageOrOptions = 'Bad Request', errors = null) {
    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      const { message = 'Bad Request', errors: optErrors = null } = messageOrOptions;
      return ApiResponse.error(res, message, optErrors || errors, 400);
    }
    return ApiResponse.error(res, messageOrOptions, errors, 400);
  }
}

module.exports = {
  ApiResponse
};

