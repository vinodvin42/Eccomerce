import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { StoreComponent } from './store.component';
import { CatalogActions } from '../../state/catalog/catalog.actions';
import { CartActions } from '../../state/cart/cart.actions';

describe('StoreComponent', () => {
  let component: StoreComponent;
  let fixture: ComponentFixture<StoreComponent>;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;

  const initialState = {
    catalog: {
      items: [
        {
          id: '1',
          name: 'Test Product',
          sku: 'TEST-001',
          price: { currency: 'USD', amount: 99.99 },
          inventory: 10,
        },
      ],
      loading: false,
      error: null,
    },
    cart: {
      items: [],
    },
  };

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [StoreComponent],
      providers: [
        provideMockStore({ initialState }),
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore) as MockStore;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadProducts on init', () => {
    spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(store.dispatch).toHaveBeenCalledWith(CatalogActions.loadProducts({ search: undefined }));
  });

  it('should dispatch search action on search input', () => {
    spyOn(store, 'dispatch');
    const event = { target: { value: 'laptop' } } as any;
    component.onSearch(event);
    expect(store.dispatch).toHaveBeenCalledWith(CatalogActions.loadProducts({ search: 'laptop' }));
  });

  it('should dispatch addItem when adding to cart', () => {
    spyOn(store, 'dispatch');
    const product = {
      id: '1',
      name: 'Test Product',
      sku: 'TEST-001',
      price: { currency: 'USD', amount: 99.99 },
      imageUrl: 'https://example.com/image.jpg',
      inventory: 10,
    };
    component.addToCart(product);
    expect(store.dispatch).toHaveBeenCalledWith(
      CartActions.addItem({
        productId: '1',
        name: 'Test Product',
        price: { currency: 'USD', amount: 99.99 },
        quantity: 1,
        imageUrl: 'https://example.com/image.jpg',
        sku: 'TEST-001',
      })
    );
  });

  it('should navigate to product detail', () => {
    component.viewProduct('product-123');
    expect(router.navigate).toHaveBeenCalledWith(['/store/product', 'product-123']);
  });

  it('should not add to cart if product is out of stock', () => {
    spyOn(store, 'dispatch');
    const product = {
      id: '1',
      name: 'Out of Stock',
      price: { currency: 'USD', amount: 99.99 },
      inventory: 0,
    };
    component.addToCart(product);
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});

