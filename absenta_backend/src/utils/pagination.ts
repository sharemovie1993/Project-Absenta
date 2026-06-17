export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 500,
};

export function getPaginationParams(request: any): PaginationParams {
  const query = request.query || {};
  
  let page = parseInt(query.page as string) || PAGINATION_DEFAULTS.PAGE;
  if (page < 1) page = 1;

  let limit = parseInt(query.limit as string) || PAGINATION_DEFAULTS.LIMIT;
  if (limit < 1) limit = 1;
  if (limit > PAGINATION_DEFAULTS.MAX_LIMIT) limit = PAGINATION_DEFAULTS.MAX_LIMIT;

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
  };
}
