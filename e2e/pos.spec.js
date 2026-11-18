import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

let page;

async function signIn(username, pin) {
  await page.getByPlaceholder('Enter username').fill(username);
  await page.getByPlaceholder('Enter PIN code').fill(pin);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function openTab(name) {
  await page.locator('aside').getByRole('button', { name, exact: true }).click();
}

test.describe('Tezbill POS feature walkthrough', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 860 },
      recordVideo: { dir: 'test-results/videos', size: { width: 1400, height: 860 } },
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.waitForTimeout(3000);
    await page.context().close();
  });

  test('01 Cashier signs in and sees only cashier screens', async () => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Tezbill POS' })).toBeVisible();
    await signIn('cashier', '2222');

    await expect(page.getByRole('button', { name: /POS \/ New Sale/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Audit Log' })).toHaveCount(0);
  });

  test('02 Cashier filters categories and builds a bill', async () => {
    await page.getByRole('button', { name: 'Dairy & Bakery', exact: true }).click();
    await page.getByRole('button', { name: /All Products/i }).click();

    await page.getByRole('button', { name: /Fresh Milk Pack 1L/i }).click();
    await page.getByRole('button', { name: /White Sandwich Bread/i }).click();
    await expect(page.getByText('2 items', { exact: true })).toBeVisible();
  });

  test('03 Cashier holds the bill and resumes it', async () => {
    await page.getByRole('button', { name: /Hold Sale/i }).click();
    await expect(page.getByText('Bill is empty', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Resume Held/i }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).first().click();
    await expect(page.getByText('2 items', { exact: true })).toBeVisible();
  });

  test('04 Cashier applies a discount and completes the sale', async () => {
    await page.getByRole('button', { name: /Cooking Oil Pouch 1L/i }).click();
    await expect(page.getByText('3 items', { exact: true })).toBeVisible();

    await page.locator('input[placeholder="0"]').fill('20');
    await page.getByRole('button', { name: /Complete Sale/i }).click();

    await expect(page.getByText('Sale Invoice Receipt', { exact: true })).toBeVisible();
    await expect(page.locator('#printable-receipt')).toContainText('Tezbill General Store');
    await expect(page.locator('#printable-receipt')).toContainText('Fresh Milk Pack 1L');
    await page.waitForTimeout(1500);
    await page.locator('#printable-receipt').locator('..').locator('button').nth(1).click();
  });

  test('05 Cashier logs out and Main Admin signs in', async () => {
    await page.locator('header').getByRole('button', { name: /Logout/i }).click();
    await expect(page.getByRole('heading', { name: 'Tezbill POS' })).toBeVisible();

    await signIn('admin', '1111');
    await expect(page.getByRole('heading', { name: 'Store Overview', exact: true })).toBeVisible();
    await expect(page.locator('aside').getByRole('button', { name: /POS \/ New Sale/i })).toHaveCount(0);
  });

  test('06 Admin dashboard shows sales chart and profit summary', async () => {
    await expect(page.getByText('Weekly Sales Overview', { exact: true })).toBeVisible();
    await expect(page.getByText('Profit & Loss Summary', { exact: true })).toBeVisible();
  });

  test('07 Admin inspects a sale and its item profit', async () => {
    await openTab('Sales');
    await expect(page.getByRole('heading', { name: 'Sales', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /View/i }).first().click();
    await expect(page.getByText('Cost at Sale', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Profit / Loss' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  });

  test('08 Admin records a supplier purchase', async () => {
    await openTab('Purchases');
    await expect(page.getByRole('heading', { name: 'Purchases', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /New Purchase/i }).click();
    await page.getByRole('button', { name: 'Add Item', exact: true }).click();
    await page.getByRole('button', { name: /Save Purchase & Add Stock/i }).click();
    await expect(page.getByText(/Purchase PUR-.* saved/i)).toBeVisible();
  });

  test('09 Admin updates daily product prices', async () => {
    await openTab('Products');
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Update Daily Prices/i }).click();
    await expect(page.getByText('Update Daily Product Prices', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save All Prices' }).click();
    await expect(page.getByText(/Daily purchase and selling prices updated/i)).toBeVisible();
  });

  test('10 Admin reviews stock movement history', async () => {
    await openTab('Stock');
    await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /History/i }).first().click();
    await expect(page.getByText(/Stock Movement History/i).first()).toBeVisible();
    await expect(page.getByText('Running Balance', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  });

  test('11 Admin opens supplier history and customer directory', async () => {
    await openTab('Suppliers');
    await expect(page.getByRole('heading', { name: 'Suppliers', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /History/i }).first().click();
    await expect(page.getByText(/Supplier Details & Purchase History/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    await openTab('Customers');
    await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
  });

  test('12 Admin switches profit and loss views', async () => {
    await openTab('Profit / Loss');
    await expect(page.getByRole('heading', { name: 'Profit / Loss', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sale-wise', exact: true }).click();
    await page.getByRole('button', { name: 'Sale Items', exact: true }).click();
    await page.getByRole('button', { name: 'Product-wise', exact: true }).click();
  });

  test('13 Admin opens daily, weekly and monthly printable reports', async () => {
    await openTab('Reports');
    await expect(
      page.getByRole('heading', { name: /Reports \(Daily \/ Weekly \/ Monthly Printable\)/i })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Weekly Report (7 Days)', exact: true }).click();
    await page.getByRole('button', { name: 'Monthly Report (This Month)', exact: true }).click();
    await page.getByRole('button', { name: 'Daily Report (Today)', exact: true }).click();
    await expect(page.locator('#printable-report')).toContainText('Itemized Products Sold');
    await expect(page.locator('#printable-report')).toContainText('Report Period Totals');

    await page.getByRole('button', { name: 'Purchases Report', exact: true }).click();
    await page.getByRole('button', { name: 'Stock Report', exact: true }).click();
    await page.getByRole('button', { name: 'Detailed Sales Report', exact: true }).click();
  });

  test('14 Admin checks the audit log', async () => {
    await openTab('Audit Log');
    await expect(page.getByRole('heading', { name: 'Audit Log', exact: true })).toBeVisible();
    await expect(page.getByText('SALE_COMPLETED').first()).toBeVisible();
    await expect(page.getByText('PURCHASE_RECORDED').first()).toBeVisible();
  });

  test('15 Admin saves store settings', async () => {
    await openTab('Settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Save Settings/i }).click();
    await expect(page.getByText('Store settings saved')).toBeVisible();
  });
});
