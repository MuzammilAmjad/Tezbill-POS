import { test, expect } from '@playwright/test';

test.describe('Tezbill POS Full End-to-End Feature Suite', () => {
  test('exercises Cashier POS billing, Hold/Resume, Admin Dashboard, Purchases, Stock History, Profit/Loss, Printable Reports, and Audit Log', async ({ page }) => {
    // 1. Open POS & Sign in as Cashier (Bilal Ahmed)
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Tezbill POS' })).toBeVisible();
    await page.getByPlaceholder('Enter username').fill('cashier');
    await page.getByPlaceholder('Enter PIN code').fill('2222');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify Cashier role navigation (POS / New Sale is visible; Audit Log & Reports are restricted)
    await expect(page.getByRole('button', { name: /POS \/ New Sale/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Audit Log' })).toHaveCount(0);

    // 2. Cashier POS Billing: Filter Categories, Add Products, Hold & Resume Sale
    await page.getByRole('button', { name: 'Dairy & Bakery', exact: true }).click();
    await page.getByRole('button', { name: /All Products/i }).click();

    await page.getByRole('button', { name: /Fresh Milk Pack 1L/i }).click();
    await page.getByRole('button', { name: /White Sandwich Bread/i }).click();

    await expect(page.getByText('2 items', { exact: true })).toBeVisible();

    // Park bill with Hold Sale and Resume it
    await page.getByRole('button', { name: /Hold Sale/i }).click();
    await expect(page.getByText('Bill is empty', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Resume Held/i }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).first().click();
    await expect(page.getByText('2 items', { exact: true })).toBeVisible();

    // Add third product, apply Discount, enter Cash Received, and Complete Sale
    await page.getByRole('button', { name: /Cooking Oil Pouch 1L/i }).click();
    await expect(page.getByText('3 items', { exact: true })).toBeVisible();

    const discountInput = page.locator('input[placeholder="0"]');
    await discountInput.fill('20');

    await page.getByRole('button', { name: /Complete Sale/i }).click();

    // 3. Verify Printable Sale Invoice Receipt Modal
    await expect(page.getByText('Sale Invoice Receipt', { exact: true })).toBeVisible();
    await expect(page.locator('#printable-receipt')).toContainText('Tezbill General Store');
    await expect(page.locator('#printable-receipt')).toContainText('Fresh Milk Pack 1L');

    // Close receipt modal
    await page.locator('#printable-receipt').locator('..').locator('button').nth(1).click();

    // 4. Logout of Cashier and Sign in as Main Admin (Hamza Tariq)
    await page.locator('header').getByRole('button', { name: /Logout/i }).click();
    await expect(page.getByRole('heading', { name: 'Tezbill POS' })).toBeVisible();

    await page.getByPlaceholder('Enter username').fill('admin');
    await page.getByPlaceholder('Enter PIN code').fill('1111');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // 5. Verify Main Admin Store Overview Dashboard (and confirm Admin does not have New Sale tab)
    await expect(page.getByRole('heading', { name: 'Store Overview', exact: true })).toBeVisible();
    await expect(page.getByText('Weekly Sales Overview', { exact: true })).toBeVisible();
    await expect(page.getByText('Profit & Loss Summary', { exact: true })).toBeVisible();
    await expect(page.locator('aside').getByRole('button', { name: /POS \/ New Sale/i })).toHaveCount(0);

    // 6. Sales Ledger & Per-Item Profit Inspector Modal
    await page.locator('aside').getByRole('button', { name: 'Sales', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sales', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /View/i }).first().click();
    await expect(page.getByText('Cost at Sale', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Profit / Loss' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // 7. Purchases: Record New Supplier Purchase & Replenish Stock
    await page.locator('aside').getByRole('button', { name: 'Purchases', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Purchases', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /New Purchase/i }).click();
    await page.getByRole('button', { name: 'Add Item', exact: true }).click();
    await page.getByRole('button', { name: /Save Purchase & Add Stock/i }).click();
    await expect(page.getByText(/Purchase PUR-.* saved/i)).toBeVisible();

    // 8. Products Catalog & Bulk Update Daily Prices Modal
    await page.locator('aside').getByRole('button', { name: 'Products', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Update Daily Prices/i }).click();
    await expect(page.getByText('Update Daily Product Prices', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save All Prices' }).click();
    await expect(page.getByText(/Daily purchase and selling prices updated/i)).toBeVisible();

    // 9. Stock Levels, Adjustment & Per-Product Movement History
    await page.locator('aside').getByRole('button', { name: 'Stock', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /History/i }).first().click();
    await expect(page.getByText(/Stock Movement History/i).first()).toBeVisible();
    await expect(page.getByText('Running Balance', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // 10. Suppliers & Customers Directories
    await page.locator('aside').getByRole('button', { name: 'Suppliers', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Suppliers', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /History/i }).first().click();
    await expect(page.getByText(/Supplier Details & Purchase History/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    await page.locator('aside').getByRole('button', { name: 'Customers', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();

    // 11. Profit / Loss Analysis (Product-wise, Sale-wise, Sale Items)
    await page.locator('aside').getByRole('button', { name: 'Profit / Loss', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Profit / Loss', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sale-wise', exact: true }).click();
    await page.getByRole('button', { name: 'Sale Items', exact: true }).click();
    await page.getByRole('button', { name: 'Product-wise', exact: true }).click();

    // 12. Printable Daily, Weekly & Monthly Itemized Sales Reports
    await page.locator('aside').getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Reports \(Daily \/ Weekly \/ Monthly Printable\)/i })).toBeVisible();
    await page.getByRole('button', { name: 'Weekly Report (7 Days)', exact: true }).click();
    await page.getByRole('button', { name: 'Monthly Report (This Month)', exact: true }).click();
    await page.getByRole('button', { name: 'Daily Report (Today)', exact: true }).click();
    await expect(page.locator('#printable-report')).toContainText('Itemized Products Sold');
    await expect(page.locator('#printable-report')).toContainText('Report Period Totals');

    await page.getByRole('button', { name: 'Purchases Report', exact: true }).click();
    await page.getByRole('button', { name: 'Stock Report', exact: true }).click();
    await page.getByRole('button', { name: 'Detailed Sales Report', exact: true }).click();

    // 13. Audit Log & Store Settings
    await page.locator('aside').getByRole('button', { name: 'Audit Log', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Audit Log', exact: true })).toBeVisible();
    await expect(page.getByText('SALE_COMPLETED').first()).toBeVisible();
    await expect(page.getByText('PURCHASE_RECORDED').first()).toBeVisible();

    await page.locator('aside').getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Save Settings/i }).click();
    await expect(page.getByText('Store settings saved')).toBeVisible();

    // Keep the final screen visible for a moment before the browser closes
    await page.waitForTimeout(4000);
  });
});
