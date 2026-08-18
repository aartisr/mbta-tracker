#!/usr/bin/env node

/** Submit every canonical URL in the live sitemap to IndexNow. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_HOST = 'mbta.ai-aarti.com';
const DEFAULT_KEY = 'fd4c7a961ceb407779a0d1cb9a15c0b9fadd138ee2a9a17d';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_BATCH_SIZE = 10_000;

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(`Usage: npm run seo:indexnow -- [options]

Options:
  --dry-run              List URLs without calling IndexNow
  --host <host>          Canonical host (default: ${DEFAULT_HOST})
  --sitemap <url|path>   Sitemap to submit (default: https://<host>/sitemap.xml)
  --key <value>          Override the IndexNow key (or use INDEXNOW_KEY)
  --batch-size <number>  URLs per request, up to ${MAX_BATCH_SIZE}
  --help                 Show this help

The key file must be publicly reachable at https://<host>/<key>.txt before submission.`);
}

function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

async function readSitemap(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, { headers: { Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' } });
    if (!response.ok) throw new Error(`Could not read sitemap ${source}: HTTP ${response.status}`);
    return { xml: await response.text(), source };
  }
  return { xml: await readFile(resolve(source), 'utf8'), source: resolve(source) };
}

async function collectUrls(sitemapSource, expectedHost, visited = new Set()) {
  if (visited.has(sitemapSource)) return [];
  visited.add(sitemapSource);

  const { xml, source } = await readSitemap(sitemapSource);
  const locations = parseSitemap(xml);
  if (/<sitemapindex\b/i.test(xml)) {
    const nested = await Promise.all(locations.map((location) => collectUrls(location, expectedHost, visited)));
    return nested.flat();
  }

  const urls = [];
  for (const location of locations) {
    try {
      const url = new URL(location);
      if (url.protocol === 'https:' && url.hostname === expectedHost) urls.push(url.toString());
    } catch {
      console.warn(`Skipping invalid sitemap URL in ${source}: ${location}`);
    }
  }
  return urls;
}

function chunk(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

async function verifyKeyFile(host, key) {
  const keyLocation = `https://${host}/${key}.txt`;
  const response = await fetch(keyLocation, { headers: { Accept: 'text/plain' } });
  if (!response.ok) throw new Error(`IndexNow key file is not live at ${keyLocation} (HTTP ${response.status}). Deploy the site before submitting.`);
  if ((await response.text()).trim() !== key) throw new Error(`IndexNow key file at ${keyLocation} does not contain the configured key.`);
  return keyLocation;
}

async function submitBatch(host, key, keyLocation, urlList) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation, urlList })
  });
  if (response.status !== 200 && response.status !== 202) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`IndexNow rejected batch with HTTP ${response.status}${body ? `: ${body}` : ''}`);
  }
  return response.status;
}

async function main() {
  if (hasFlag('--help')) return printHelp();

  const host = (readOption('--host') || process.env.INDEXNOW_HOST || DEFAULT_HOST).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const key = readOption('--key') || process.env.INDEXNOW_KEY || DEFAULT_KEY;
  const sitemapSource = readOption('--sitemap') || `https://${host}/sitemap.xml`;
  const requestedBatchSize = Number(readOption('--batch-size') || MAX_BATCH_SIZE);
  const batchSize = Number.isInteger(requestedBatchSize) && requestedBatchSize > 0 ? Math.min(requestedBatchSize, MAX_BATCH_SIZE) : MAX_BATCH_SIZE;
  const dryRun = hasFlag('--dry-run');

  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) throw new Error('IndexNow key must be 8–128 letters, numbers, or dashes.');
  const urls = [...new Set(await collectUrls(sitemapSource, host))].sort();
  if (urls.length === 0) throw new Error(`No canonical https://${host} URLs found in ${sitemapSource}.`);

  console.log(`Found ${urls.length} canonical URL${urls.length === 1 ? '' : 's'} in ${sitemapSource}.`);
  if (dryRun) {
    urls.forEach((url) => console.log(url));
    console.log('Dry run complete; nothing was submitted.');
    return;
  }

  const keyLocation = await verifyKeyFile(host, key);
  const batches = chunk(urls, batchSize);
  for (const [index, batch] of batches.entries()) {
    const status = await submitBatch(host, key, keyLocation, batch);
    console.log(`Batch ${index + 1}/${batches.length}: ${batch.length} URLs accepted (HTTP ${status}).`);
  }
  console.log(`IndexNow accepted all ${urls.length} canonical URLs. Acceptance requests crawling; it does not guarantee indexing.`);
}

main().catch((error) => {
  console.error(`IndexNow submission failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
