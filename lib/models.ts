import { User } from "@prisma/client";

export interface IValidationError {
  field: string;
  rule: string;
  message: string;
}

export interface IApiError extends Error {
  code: string;
  message: string;
}

export interface IApiResponse<T> {
  data?: T;
  validationErrors?: IValidationError[];
  error?: Error;
}

export interface PaginationData {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
  joinedAt: Date;
}

export interface SignInResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  organizations: Organization[];
  message: string;
}