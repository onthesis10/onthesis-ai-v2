import { test, expect } from '@playwright/test';

const projectId = 'project-e2e';
const chapterId = 'chapter_1';
const initialHtml = '<p>Draft awal yang perlu direvisi.</p>';

test('Writing Studio session and SSE diff flow works end-to-end', async ({ page }) => {
  test.setTimeout(180_000);
  const context = page.context();
  let agentRunCount = 0;
  let saveCalls = 0;
  const savedContents: string[] = [];

  await context.route('**/api/user/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          uid: 'user-e2e',
          email: 'e2e@onthesis.test',
          displayName: 'E2E User',
          photoURL: null,
          isPro: false,
        },
      }),
    });
  });

  await context.route('**/api/agent/history/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: null,
        sessions: [],
      }),
    });
  });

  await context.route('**/api/project-context/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: projectId,
        title: 'Project E2E',
        methodology: 'mixed methods',
        references: [],
        chapters_structure: [
          { id: chapterId, title: 'BAB I: Pendahuluan', index: 0 },
        ],
      }),
    });
  });

  await context.route('**/api/project/**/chapter/save', async (route) => {
    saveCalls += 1;
    const payload = route.request().postDataJSON?.() as { content?: string } | undefined;
    savedContents.push(String(payload?.content || ''));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success' }),
    });
  });

  await context.route('**/api/project/**/chapter/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: initialHtml }),
    });
  });

  await context.route('**/api/projects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [{ id: projectId, title: 'Project E2E' }] }),
    });
  });

  await context.route('**/api/my-analyses', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ history: [] }),
    });
  });

  await context.route('**/api/agent/run', async (route) => {
    agentRunCount += 1;
    const diffId = agentRunCount === 1 ? 'diff-accept' : 'diff-reject';
    const newText = agentRunCount === 1
      ? '<p>Draft revisi diterima oleh agent.</p>'
      : '<p>Draft revisi yang akan ditolak.</p>';

    const events = [
      { type: 'STEP', step: 'planning', message: 'Menyusun rencana...' },
      { type: 'STEP', step: 'executing', message: 'Menjalankan agen...' },
      { type: 'TEXT_DELTA', delta: 'Agent memproses permintaan.' },
      {
        type: 'PENDING_DIFF',
        diff: {
          diffId,
          diff_id: diffId,
          type: 'edit',
          paraId: 'P-1',
          old_text: 'Draft awal yang perlu direvisi.',
          new_text: newText,
          reason: 'Perbaikan akademik dari agent.',
        },
      },
      { type: 'DONE', message: 'Selesai.' },
    ];

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''),
    });
  });

  await page.goto(`/writing?id=${projectId}`, { waitUntil: 'commit' });

  await expect(page.getByTitle('Command Palette (Ctrl+K)')).toBeVisible({ timeout: 120_000 });
  await page.getByTitle('Command Palette (Ctrl+K)').click();
  await page.getByPlaceholder('Ketik command atau aksi...').fill('Start Writing Session');
  await page.getByRole('button', { name: 'Start Writing Session' }).click();
  await expect(page.getByRole('heading', { name: 'Writing Session' })).toBeVisible();
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) =>
      el.textContent?.includes('Mulai Sesi'),
    );
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Mulai Sesi button not found');
    }
    button.click();
  });
  await expect(page.getByRole('button', { name: 'END', exact: true })).toBeVisible();

  const agentInput = page.getByPlaceholder('Instruksikan agent...');

  await agentInput.fill('Perbaiki paragraf pembuka ini agar lebih akademik.');
  await agentInput.press('Enter');

  await expect(page.getByText('1 perubahan menunggu', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).first().click();

  await expect.poll(() => saveCalls).toBe(1);
  await expect(page.getByText('1 perubahan menunggu', { exact: true })).toHaveCount(0);
  await expect
    .poll(() => savedContents.some((content) => content.includes('Draft revisi diterima oleh agent.')))
    .toBe(true);

  await agentInput.fill('Coba revisi lagi, tetapi nanti saya tolak.');
  await agentInput.press('Enter');

  await expect(page.getByText('1 perubahan menunggu', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reject' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Reject' }).first().click();

  await expect(page.getByText('1 perubahan menunggu', { exact: true })).toHaveCount(0);
  await page.waitForTimeout(2500);
  expect(savedContents.some((content) => content.includes('Draft revisi yang akan ditolak.'))).toBe(false);
});
