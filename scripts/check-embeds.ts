#!/usr/bin/env node
/**
 * Simple script to validate fc:miniapp meta presence on key pages.
 * Usage: ts-node scripts/check-embeds.ts (or compile and run with node)
 */
import https from 'https';
import http from 'http';

const PAGES = [
  '/',
  '/leaderboard',
];

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        const { statusCode } = res;
        if (!statusCode || statusCode >= 400) {
          reject(new Error(`HTTP ${statusCode}`));
          res.resume();
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function main() {
  const base = process.env.BASE_URL || 'https://triviacast.xyz';
  let failed = 0;
  for (const path of PAGES) {
    const url = base.replace(/\/$/, '') + path;
    process.stdout.write(`Checking ${url} ... `);
    try {
      const html = await fetchUrl(url);
      const hasMiniApp = /<meta[^>]+name=["']fc:miniapp["'][^>]*>/i.test(html);
      if (!hasMiniApp) {
        failed++;
        console.log('MISSING fc:miniapp');
        continue;
      }
      console.log('OK');
    } catch (e: any) {
      failed++;
      console.log(`ERROR (${e?.message || e})`);
    }
  }
  if (failed) {
    console.error(`\n${failed} page(s) failed meta checks.`);
    process.exit(1);
  } else {
    console.log('\nAll pages passed fc:miniapp checks.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
