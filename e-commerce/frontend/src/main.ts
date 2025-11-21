import 'zone.js';

import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { appRoutes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { withTenantHeaders } from './app/core/interceptors/tenant.interceptor';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { reducers } from './app/state';
import { CatalogEffects } from './app/state/catalog/catalog.effects';
import { OrdersEffects } from './app/state/orders/orders.effects';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([withTenantHeaders, authInterceptor])),
    provideAnimations(),
    provideStore(reducers),
    provideEffects([CatalogEffects, OrdersEffects]),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: environment.production,
      connectInZone: true,
    }),
  ],
}).catch((err) => console.error(err));

