#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Resolver } from 'dns/promises';

const root = process.cwd();
const registryPath = path.join(root, 'registry.json');

const resolver = new Resolver();

function fmt(ok, msg) {
  return { ok, msg };
}

async function checkCNAME(target) {
  try {
    // Resolve A/AAAA of target; if it itself is a CNAME chain, most resolvers will follow.
    const [a, aaaa] = await Promise.allSettled([
      resolver.resolve4(target),
      resolver.resolve6(target)
    ]);
    if (a.status === 'fulfilled' || aaaa.status === 'fulfilled') {
      const addrs = [];
      if (a.status === 'fulfilled') addrs.push(...a.value);
      if (aaaa.status === 'fulfilled') addrs.push(...aaaa.value);
      return fmt(true, `resolves to ${addrs.join(', ')}`);
    }
    return fmt(false, 'target does not resolve (no A/AAAA)');
  } catch (e) {
    return fmt(false, `resolve error: ${e.message}`);
  }
}

async function main() {
  const data = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  const results = [];
  for (const rec of data.records) {
    if (rec.type === 'CNAME') {
      const check = await checkCNAME(rec.value);
      results.push({ subdomain: rec.subdomain, type: rec.type, target: rec.value, ...check });
    } else if (rec.type === 'A' || rec.type === 'AAAA') {
      // Basic IP format check
      const ip4 = /^((25[0-5]|2[0-4]\d|[01]?\d?\d)(\.|$)){4}$/;
      const ip6 = /^[0-9a-f:]+$/i;
      const ok = rec.type === 'A' ? ip4.test(rec.value) : ip6.test(rec.value);
      results.push({ subdomain: rec.subdomain, type: rec.type, target: rec.value, ok, msg: ok ? 'looks like a valid IP' : 'invalid IP format' });
    } else if (rec.type === 'TXT') {
      const ok = typeof rec.value === 'string' && rec.value.length > 0;
      results.push({ subdomain: rec.subdomain, type: rec.type, target: rec.value, ok, msg: ok ? 'ok' : 'empty value' });
    }
  }
  // Print markdown summary to stdout
  let out = 'DNS check summary for registry.json\n\n';
  for (const r of results) {
    const name = r.subdomain ? `${r.subdomain}.nicheweb.dev` : 'nicheweb.dev';
    out += `- ${name} ${r.type} -> ${r.target} : ${r.ok ? 'OK' : 'FAIL'} (${r.msg})\n`;
  }
  console.log(out);
}

main().catch(err => { console.error(err); process.exit(1); });
