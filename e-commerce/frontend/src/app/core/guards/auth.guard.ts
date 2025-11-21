import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../services/auth.service';

const normalizeRole = (role?: string | null) => role?.toLowerCase().replace(/[^a-z]/g, '') ?? '';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const user = authService.getStoredUser();
  const normalizedRole = normalizeRole(user?.role);
  const allowedRoles = route.data && (route.data['roles'] as string[] | undefined);
  const normalizedAllowed = allowedRoles?.map((role) => normalizeRole(role));

  if (normalizedAllowed && (!normalizedRole || !normalizedAllowed.includes(normalizedRole))) {
    // Customers should stay in the store experience
    if (normalizedRole === 'customer') {
      router.navigate(['/store']);
    } else {
      router.navigate(['/login']);
    }
    return false;
  }

  return true;
};

