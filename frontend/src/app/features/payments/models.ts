export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface PaymentResponse {
  id: number;
  senderAccount: string;
  receiverAccount: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  notes: string | null;
  creditorName: string;
}

export interface PagedResult<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}
