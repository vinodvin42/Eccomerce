import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ProductsComponent } from './features/products/products.component';
import { OrdersComponent } from './features/orders/orders.component';
import { TenantsComponent } from './features/tenants/tenants.component';
import { UsersComponent } from './features/users/users.component';
import { AuditLogsComponent } from './features/audit-logs/audit-logs.component';
import { MastersComponent } from './features/masters/masters.component';
import { DiscountsComponent } from './features/discounts/discounts.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { StoreLayoutComponent } from './layouts/store-layout/store-layout.component';
import { StoreComponent } from './features/store/store.component';
import { CartComponent } from './features/cart/cart.component';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { OrderHistoryComponent } from './features/order-history/order-history.component';
import { OrderDetailComponent } from './features/order-detail/order-detail.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ProductDetailComponent } from './features/product-detail/product-detail.component';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'store', pathMatch: 'full' },
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    data: { roles: ['TenantAdmin', 'SuperAdmin'] },
    children: [
      { path: '', component: DashboardComponent, title: 'Dashboard' },
      { path: 'products', component: ProductsComponent, title: 'Products' },
      { path: 'orders', component: OrdersComponent, title: 'Orders' },
      {
        path: 'tenants',
        component: TenantsComponent,
        title: 'Tenants',
        canActivate: [authGuard],
        data: { roles: ['super_admin'] },
      },
      { path: 'users', component: UsersComponent, title: 'Users' },
      { path: 'audit-logs', component: AuditLogsComponent, title: 'Audit Logs' },
      { path: 'masters', component: MastersComponent, title: 'Master Data' },
      { path: 'discounts', component: DiscountsComponent, title: 'Discounts & Promotions' },
      { path: 'dashboard', component: DashboardComponent, title: 'Dashboard' },
    ],
  },
  // Customer-facing routes with store layout
  {
    path: 'store',
    component: StoreLayoutComponent,
    children: [
      { path: '', component: StoreComponent, title: 'Store' },
      { path: 'product/:id', component: ProductDetailComponent, title: 'Product Details' },
    ],
  },
  {
    path: 'cart',
    component: StoreLayoutComponent,
    children: [{ path: '', component: CartComponent, title: 'Shopping Cart' }],
  },
  {
    path: 'checkout',
    component: StoreLayoutComponent,
    children: [{ path: '', component: CheckoutComponent, title: 'Checkout' }],
  },
  {
    path: 'my-orders',
    component: StoreLayoutComponent,
    children: [{ path: '', component: OrderHistoryComponent, title: 'My Orders' }],
  },
  {
    path: 'orders/:id',
    component: StoreLayoutComponent,
    children: [{ path: '', component: OrderDetailComponent, title: 'Order Details' }],
  },
  { path: 'login', component: LoginComponent, title: 'Sign In' },
  { path: 'register', component: RegisterComponent, title: 'Create Account' },
  { path: '**', redirectTo: '' },
];

