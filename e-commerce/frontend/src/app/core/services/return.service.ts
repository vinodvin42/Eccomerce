import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  CreateReturnRequest,
  ReturnDecisionPayload,
  ReturnListResponse,
  ReturnRefundPayload,
  ReturnRequest,
  ReturnStatus,
} from '../../shared/models/returns';

@Injectable({
  providedIn: 'root',
})
export class ReturnService {
  private readonly baseUrl = `${environment.apiBaseUrl}/returns`;

  constructor(private readonly http: HttpClient) {}

  createReturnRequest(payload: CreateReturnRequest): Observable<ReturnRequest> {
    return this.http.post<ReturnRequest>(this.baseUrl, payload);
  }

  listReturns(page = 1, pageSize = 20, status?: ReturnStatus): Observable<ReturnListResponse> {
    const params: Record<string, string> = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    if (status) {
      params['status'] = status;
    }
    return this.http.get<ReturnListResponse>(this.baseUrl, { params });
  }

  approveReturn(returnId: string, payload: ReturnDecisionPayload): Observable<ReturnRequest> {
    return this.http.post<ReturnRequest>(`${this.baseUrl}/${returnId}/approve`, payload);
  }

  rejectReturn(returnId: string, payload: Pick<ReturnDecisionPayload, 'resolutionNotes'>): Observable<ReturnRequest> {
    return this.http.post<ReturnRequest>(`${this.baseUrl}/${returnId}/reject`, payload);
  }

  refundReturn(returnId: string, payload: ReturnRefundPayload): Observable<ReturnRequest> {
    return this.http.post<ReturnRequest>(`${this.baseUrl}/${returnId}/refund`, payload);
  }
}

