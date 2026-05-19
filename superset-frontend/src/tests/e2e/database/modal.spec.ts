/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { test, expect } from '@playwright/test';
import type { Page, Response } from '@playwright/test';

const DATABASE_LIST = 'databaseview/list';

function isValidateParamsResponse(response: Response): boolean {
  return (
    response.url().includes('/api/v1/database/validate_parameters') &&
    response.request().method() === 'POST'
  );
}

function isCreateDbResponse(response: Response): boolean {
  return (
    response.url().includes('/api/v1/database/') &&
    !response.url().includes('validate_parameters') &&
    response.request().method() === 'POST'
  );
}

async function closeModal(page: Page): Promise<void> {
  const modal = page.getByTestId('database-modal');
  if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByLabel('Close').nth(1).click();
  }
}

test.describe('Add database', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DATABASE_LIST);
    await closeModal(page);
    await page.getByTestId('btn-create-database').click();
  });

  test('should open dynamic form', async ({ page }) => {
    await page.locator('.preferred > :nth-child(1)').click();

    await expect(page.locator('input[name="host"]')).toHaveValue('');
    await expect(page.locator('input[name="port"]')).toHaveValue('');
    await expect(page.locator('input[name="database"]')).toHaveValue('');
    await expect(page.locator('input[name="username"]')).toHaveValue('');
    await expect(page.locator('input[name="password"]')).toHaveValue('');
    await expect(page.locator('input[name="database_name"]')).toHaveValue('');
  });

  test('should open sqlalchemy form', async ({ page }) => {
    await page.locator('.preferred > :nth-child(1)').click();
    await page.getByTestId('sqla-connect-btn').click();

    await expect(page.getByTestId('database-name-input')).toBeVisible();
    await expect(page.getByTestId('sqlalchemy-uri-input')).toBeVisible();
  });

  test('show error alerts on dynamic form for bad host', async ({ page }) => {
    test.setTimeout(120_000);

    await page.locator('.preferred > :nth-child(1)').click();

    await page.locator('input[name="host"]').fill('badhost');
    await page.locator('input[name="port"]').fill('5432');
    await page.locator('input[name="username"]').fill('testusername');
    await page.locator('input[name="database"]').fill('testdb');
    await page.locator('input[name="password"]').fill('testpass');

    const validatePromise1 = page.waitForResponse(isValidateParamsResponse, {
      timeout: 30000,
    });
    await page.locator('body').click({ position: { x: 0, y: 0 } });
    await validatePromise1;

    const submitBtn = page.getByTestId('btn-submit-connection');
    await expect(submitBtn).toBeEnabled();

    const validatePromise2 = page.waitForResponse(isValidateParamsResponse, {
      timeout: 30000,
    });
    const createDbPromise = page.waitForResponse(isCreateDbResponse, {
      timeout: 60000,
    });
    await submitBtn.click({ force: true });
    await validatePromise2;
    await createDbPromise;

    await expect(
      page
        .locator('.ant-form-item-explain-error')
        .filter({ hasText: "The hostname provided can't be resolved" }),
    ).toBeVisible();
  });

  test('show error alerts on dynamic form for bad port', async ({ page }) => {
    test.setTimeout(120_000);

    await page.locator('.preferred > :nth-child(1)').click();

    const validatePromise1 = page.waitForResponse(isValidateParamsResponse, {
      timeout: 30000,
    });
    await page.locator('input[name="host"]').fill('localhost');
    await page.locator('body').click({ position: { x: 0, y: 0 } });
    await validatePromise1;

    const validatePromise2 = page.waitForResponse(isValidateParamsResponse, {
      timeout: 30000,
    });
    await page.locator('input[name="port"]').fill('5430');
    await page.locator('input[name="database"]').fill('testdb');
    await page.locator('input[name="username"]').fill('testusername');
    await validatePromise2;

    const validatePromise3 = page.waitForResponse(isValidateParamsResponse);
    await page.locator('input[name="password"]').fill('testpass');
    await validatePromise3;

    const submitBtn = page.getByTestId('btn-submit-connection');
    await expect(submitBtn).toBeEnabled();

    const validatePromise4 = page.waitForResponse(isValidateParamsResponse, {
      timeout: 30000,
    });
    await submitBtn.click({ force: true });
    await validatePromise4;

    const createDbPromise = page.waitForResponse(isCreateDbResponse, {
      timeout: 60000,
    });
    await page.locator('body').click({ position: { x: 0, y: 0 } });
    await submitBtn.click({ force: true });
    await createDbPromise;

    await expect(
      page
        .locator('.ant-form-item-explain-error')
        .filter({ hasText: 'The port is closed' }),
    ).toBeVisible();
  });
});
