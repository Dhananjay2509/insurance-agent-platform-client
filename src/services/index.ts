import { api, apiRequest } from './apiClient';
import type {
  Agent,
  Customer,
  DashboardResponse,
  DocumentShareResponse,
  EligibleProductsResponse,
  NotificationRecord,
  PaginationMeta,
  Payment,
  PaymentLinkResponse,
  Policy,
  Product,
  PublicPaymentStatus,
  Quotation,
} from '../types/api';

/**
 * Typed API surface, one function per endpoint. Components call these rather
 * than building URLs, so a route change is a single-file edit.
 */

export const authApi = {
  register: (body: { name: string; email: string; password: string; phone: string }) =>
    api.post<{ agent: Agent; token: string }>('/auth/register', body),
  login: (body: { email: string; password: string }) =>
    api.post<{ agent: Agent; token: string }>('/auth/login', body),
  logout: () => api.post<{ message: string }>('/auth/logout'),
  me: (signal?: AbortSignal) =>
    apiRequest<{ agent: Agent }>('/auth/me', { signal, skipUnauthorizedHandler: true }).then(
      (r) => r.data,
    ),
};

export const dashboardApi = {
  get: (signal?: AbortSignal) => api.get<DashboardResponse>('/dashboard', signal),
};

export const productApi = {
  list: (params: { category?: string; search?: string } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams({ limit: '100' });
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    return api.get<{ products: Product[] }>(`/products?${query}`, signal);
  },
  get: (id: string, signal?: AbortSignal) => api.get<{ product: Product }>(`/products/${id}`, signal),
};

export const customerApi = {
  list: (params: { search?: string; page?: number } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams({ limit: '50', page: String(params.page ?? 1) });
    if (params.search) query.set('search', params.search);
    return apiRequest<{ customers: Customer[] }>(`/customers?${query}`, { signal });
  },
  get: (id: string, signal?: AbortSignal) => api.get<{ customer: Customer }>(`/customers/${id}`, signal),
  create: (body: Record<string, unknown>) => api.post<{ customer: Customer }>('/customers', body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<{ customer: Customer }>(`/customers/${id}`, body),
  remove: (id: string) =>
    api.del<{
      deleted: true;
      deletedQuotations: number;
      deletedDocuments: number;
      deletedPayments: number;
    }>(`/customers/${id}`),
  eligibleProducts: (id: string, signal?: AbortSignal) =>
    api.get<EligibleProductsResponse>(`/customers/${id}/eligible-products`, signal),
};

export const quotationApi = {
  create: (body: { customerId: string; productId: string }) =>
    api.post<{ quotation: Quotation }>('/quotations', body),
  get: (id: string, signal?: AbortSignal) => api.get<{ quotation: Quotation }>(`/quotations/${id}`, signal),
  listForCustomer: (customerId: string, signal?: AbortSignal) =>
    api.get<{ quotations: Quotation[] }>(`/quotations?customerId=${customerId}&limit=50`, signal),
};

export const documentApi = {
  generate: (quotationId: string) =>
    api.post<DocumentShareResponse>(`/documents/${quotationId}/generate`),
  get: (quotationId: string, signal?: AbortSignal) =>
    api.get<DocumentShareResponse>(`/documents/${quotationId}`, signal),
  downloadUrl: (quotationId: string) => `/api/documents/${quotationId}/download`,
};

export const paymentApi = {
  createLink: (quotationId: string) =>
    api.post<PaymentLinkResponse>('/payments/create-link', { quotationId }),
  listForQuotation: (quotationId: string, signal?: AbortSignal) =>
    api.get<{ payments: Payment[] }>(`/payments/by-quotation/${quotationId}`, signal),
  get: (id: string, signal?: AbortSignal) =>
    api.get<{ payment: Payment; policy: Policy | null }>(`/payments/${id}`, signal),
  publicStatus: (reference: string, signal?: AbortSignal) =>
    api.get<PublicPaymentStatus>(`/payments/public/status/${reference}`, signal),
};

export const policyApi = {
  list: (params: { customerId?: string } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams({ limit: '50' });
    if (params.customerId) query.set('customerId', params.customerId);
    return apiRequest<{ policies: Policy[] }>(`/policies?${query}`, { signal });
  },
  get: (id: string, signal?: AbortSignal) => api.get<{ policy: Policy }>(`/policies/${id}`, signal),
};

export const notificationApi = {
  list: (signal?: AbortSignal) =>
    api.get<{ notifications: NotificationRecord[] }>('/notifications', signal),
  retryFailed: () => api.post<{ retried: number; sent: number }>('/notifications/retry-failed'),
};

export type { PaginationMeta };
