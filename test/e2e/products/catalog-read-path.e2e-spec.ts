/**
 * Shopper catalog reads: optional auth, active-only for customers, full catalog for operators.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import {
  E2eCatalogHelper,
  E2eCatalogProduct,
} from 'src/testing/helpers/e2e-catalog.helper';
import { E2eCheckoutHelper } from 'src/testing/helpers/e2e-checkout.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';

describe('Catalog read path (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let http: E2eHttpClient;
  let admin: AuthSession;
  let customer: AuthSession;
  let activeProduct: E2eCatalogProduct;
  let inactiveProduct: E2eCatalogProduct;
  let activeCategoryId: number;
  let inactiveCategoryId: number;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);

    admin = await E2eCatalogHelper.seedAdminSession(moduleRef, http);
    customer = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'Catalog',
      lastName: 'Shopper',
    });

    activeProduct = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      5,
      'shop-active',
    );
    inactiveProduct = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      5,
      'shop-inactive',
    );

    const deactivateProduct = await http
      .post(`${E2E_API_PREFIX}/products/${inactiveProduct.id}/deactivate`)
      .set(AuthTestHelper.bearer(admin.accessToken));
    expect(deactivateProduct.status).toBe(HttpStatus.NO_CONTENT);

    const stamp = Date.now();
    const activeCategory = await http
      .post(`${E2E_API_PREFIX}/categories`)
      .set(AuthTestHelper.bearer(admin.accessToken))
      .send({
        name: `E2E Shop Active ${stamp}`,
        slug: `e2e-shop-active-${stamp}`,
      });
    expect(activeCategory.status).toBe(HttpStatus.CREATED);
    activeCategoryId = Number(activeCategory.body.id);

    const inactiveCategory = await http
      .post(`${E2E_API_PREFIX}/categories`)
      .set(AuthTestHelper.bearer(admin.accessToken))
      .send({
        name: `E2E Shop Inactive ${stamp}`,
        slug: `e2e-shop-inactive-${stamp}`,
      });
    expect(inactiveCategory.status).toBe(HttpStatus.CREATED);
    inactiveCategoryId = Number(inactiveCategory.body.id);

    const deactivateCategory = await http
      .post(`${E2E_API_PREFIX}/categories/${inactiveCategoryId}/deactivate`)
      .set(AuthTestHelper.bearer(admin.accessToken));
    expect(deactivateCategory.status).toBe(HttpStatus.NO_CONTENT);
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  it('lets an anonymous caller list only active products', async () => {
    const leaked = await http.get(`${E2E_API_PREFIX}/products`).query({
      search: inactiveProduct.sku,
      isActive: false,
    });
    expect(leaked.status).toBe(HttpStatus.OK);
    const leakedIds = (leaked.body.items as Array<{ id: number }>).map(
      (item) => item.id,
    );
    expect(leakedIds).not.toContain(inactiveProduct.id);

    const listed = await http.get(`${E2E_API_PREFIX}/products`).query({
      search: activeProduct.sku,
    });
    expect(listed.status).toBe(HttpStatus.OK);
    const listedItems = listed.body.items as Array<{
      id: number;
      updatedAt: string;
    }>;
    const listedIds = listedItems.map((item) => item.id);
    expect(listedIds).toContain(activeProduct.id);
    const listedActive = listedItems.find((item) => item.id === activeProduct.id);
    expect(listedActive?.updatedAt).toEqual(expect.any(String));
    expect(Date.parse(listedActive!.updatedAt)).not.toBeNaN();
  });

  it('returns 404 to shoppers for inactive product detail and 200 to operators', async () => {
    const anonymous = await http.get(
      `${E2E_API_PREFIX}/products/${inactiveProduct.id}`,
    );
    expect(anonymous.status).toBe(HttpStatus.NOT_FOUND);

    const asCustomer = await http
      .get(`${E2E_API_PREFIX}/products/${inactiveProduct.id}`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect(asCustomer.status).toBe(HttpStatus.NOT_FOUND);

    const asAdmin = await http
      .get(`${E2E_API_PREFIX}/products/${inactiveProduct.id}`)
      .set(AuthTestHelper.bearer(admin.accessToken));
    expect(asAdmin.status).toBe(HttpStatus.OK);
    expect(asAdmin.body.id).toBe(inactiveProduct.id);
    expect(asAdmin.body.isActive).toBe(false);
  });

  it('lets a registered customer list an admin-created product and add it to a cart', async () => {
    const listed = await http
      .get(`${E2E_API_PREFIX}/products`)
      .set(AuthTestHelper.bearer(customer.accessToken))
      .query({ search: activeProduct.sku });
    expect(listed.status).toBe(HttpStatus.OK);
    const listedIds = (listed.body.items as Array<{ id: number }>).map(
      (item) => item.id,
    );
    expect(listedIds).toContain(activeProduct.id);

    const cartId = await E2eCheckoutHelper.createCartWithItem(
      http,
      customer.accessToken,
      activeProduct.id,
    );
    expect(cartId).toBeGreaterThan(0);
  });

  it('lets shoppers list only active categories while operators can filter inactive', async () => {
    const shopperList = await http.get(`${E2E_API_PREFIX}/categories`).query({
      isActive: false,
    });
    expect(shopperList.status).toBe(HttpStatus.OK);
    const shopperCategories = shopperList.body as Array<{
      id: number;
      productCount: number;
    }>;
    const shopperIds = shopperCategories.map((item) => item.id);
    expect(shopperIds).toContain(activeCategoryId);
    expect(shopperIds).not.toContain(inactiveCategoryId);
    expect(
      shopperCategories.every(
        (item) =>
          typeof item.productCount === 'number' && item.productCount >= 0,
      ),
    ).toBe(true);

    const emptyActive = shopperCategories.find(
      (item) => item.id === activeCategoryId,
    );
    expect(emptyActive?.productCount).toBe(0);

    const operatorList = await http
      .get(`${E2E_API_PREFIX}/categories`)
      .set(AuthTestHelper.bearer(admin.accessToken))
      .query({ isActive: false });
    expect(operatorList.status).toBe(HttpStatus.OK);
    const operatorIds = (operatorList.body as Array<{ id: number }>).map(
      (item) => item.id,
    );
    expect(operatorIds).toContain(inactiveCategoryId);

    const shopperDetail = await http.get(
      `${E2E_API_PREFIX}/categories/${inactiveCategoryId}`,
    );
    expect(shopperDetail.status).toBe(HttpStatus.NOT_FOUND);

    const operatorDetail = await http
      .get(`${E2E_API_PREFIX}/categories/${inactiveCategoryId}`)
      .set(AuthTestHelper.bearer(admin.accessToken));
    expect(operatorDetail.status).toBe(HttpStatus.OK);
    expect(operatorDetail.body.isActive).toBe(false);
    expect(operatorDetail.body.productCount).toBe(0);

    const activeDetail = await http.get(
      `${E2E_API_PREFIX}/categories/${activeCategoryId}`,
    );
    expect(activeDetail.status).toBe(HttpStatus.OK);
    expect(activeDetail.body.productCount).toBe(0);
  });

  it('keeps product and category mutations operator-only', async () => {
    const anonymousCreate = await http.post(`${E2E_API_PREFIX}/products`).send({
      name: 'Should Fail',
      sku: `E2E-DENIED-${Date.now()}`,
      price: 10,
    });
    expect(anonymousCreate.status).toBe(HttpStatus.UNAUTHORIZED);

    const customerCreate = await http
      .post(`${E2E_API_PREFIX}/products`)
      .set(AuthTestHelper.bearer(customer.accessToken))
      .send({
        name: 'Should Fail',
        sku: `E2E-DENIED-${Date.now()}`,
        price: 10,
      });
    expect(customerCreate.status).toBe(HttpStatus.FORBIDDEN);

    const customerCategory = await http
      .post(`${E2E_API_PREFIX}/categories`)
      .set(AuthTestHelper.bearer(customer.accessToken))
      .send({ name: `Denied ${Date.now()}` });
    expect(customerCategory.status).toBe(HttpStatus.FORBIDDEN);
  });
});
