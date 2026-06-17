export const sendResponse = (reply: any, statusCode: number, success: boolean, message: string, data?: any) => {
  return reply.status(statusCode).send({
    success,
    message,
    data,
  });
};

export const sendError = (reply: any, statusCode: number, message: string, error?: any) => {
  return reply.status(statusCode).send({
    success: false,
    message,
    error: error?.message || error,
  });
};
