import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TenantService } from '../services/tenant.service';

export function withTenantHeaders(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const tenantService = inject(TenantService);
  const headers = tenantService.enrichHeaders(req.headers);
  const cloned = req.clone({ headers });
  return next(cloned);
}

