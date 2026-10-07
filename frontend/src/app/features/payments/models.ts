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

export interface PaymentRequest {
  senderAccount: string;
  receiverAccount: string;
  amount: number;
  currency: string;
  notes: string;
  creditorName: string;
}

export interface BulkFailure {
  rowNumber: number;
  errors: string[];
}

export interface BulkUploadResult {
  failures: BulkFailure[];
  validRows: PaymentResponse[];
  successCount: number;
  failureCount: number;
}
