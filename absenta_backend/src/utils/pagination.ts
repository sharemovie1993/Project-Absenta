export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100000,
};

export function getPaginationParams(request: any, customMaxLimit?: number): PaginationParams {
  const query = request.query || {};
  
  let page = parseInt(query.page as string) || PAGINATION_DEFAULTS.PAGE;
  if (page < 1) page = 1;

  const maxLimit = customMaxLimit || PAGINATION_DEFAULTS.MAX_LIMIT;

  let limit = parseInt(query.limit as string) || PAGINATION_DEFAULTS.LIMIT;
  if (limit < 1) limit = 1;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
  };
}
