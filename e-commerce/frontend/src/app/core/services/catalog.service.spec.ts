import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { CatalogService } from './catalog.service';
import { environment } from '../../../environments/environment';

describe('CatalogService', () => {
  let service: CatalogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CatalogService],
    });
    service = TestBed.inject(CatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should list products', () => {
    const mockResponse = {
      items: [
        {
          id: '1',
          name: 'Test Product',
          sku: 'TEST-001',
          price: { currency: 'USD', amount: 99.99 },
          inventory: 10,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    };

    service.listProducts().subscribe((response) => {
      expect(response).toEqual(mockResponse);
      expect(response.items.length).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/products?page=1&pageSize=20`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should list products with search', () => {
    const mockResponse = {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    };

    service.listProducts(1, 20, 'laptop').subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/products?page=1&pageSize=20&search=laptop`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should get a product by ID', () => {
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      sku: 'TEST-001',
      price: { currency: 'USD', amount: 99.99 },
      inventory: 10,
    };

    service.getProduct('1').subscribe((product) => {
      expect(product).toEqual(mockProduct);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/products/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
  });

  it('should create a product', () => {
    const mockProduct = {
      id: '1',
      name: 'New Product',
      sku: 'NEW-001',
      price: { currency: 'USD', amount: 49.99 },
      inventory: 5,
    };

    service
      .createProduct({
        name: 'New Product',
        sku: 'NEW-001',
        price: { currency: 'USD', amount: 49.99 },
        inventory: 5,
      })
      .subscribe((product) => {
        expect(product).toEqual(mockProduct);
      });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/products`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'New Product',
      sku: 'NEW-001',
      price: { currency: 'USD', amount: 49.99 },
      inventory: 5,
    });
    req.flush(mockProduct);
  });
});

