#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fetch from 'cross-fetch';

// This script is a placeholder showing how to integrate with Cloudflare DNS via API tokens.
// It reads registry.json and would sync A/AAAA/CNAME/TXT records for subdomains under nicheweb.dev.
// You must set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN env vars before running.

const root = process.cwd();
const registryPath = path.join(root, 'registry.json');

const CF_API = 'https://api.cloudflare.com/client/v4';

async function cfFetch(pathname, init = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN not set');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const res = await fetch(`${CF_API}${pathname}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function listRecords(zoneId) {
  const out = await cfFetch(`/zones/${zoneId}/dns_records?per_page=1000`);
  return out.result;
}

async function upsertRecord(zoneId, rec) {
  // Find existing by name+type
  const name = rec.subdomain ? `${rec.subdomain}.nicheweb.dev` : 'nicheweb.dev';
  const existing = await cfFetch(`/zones/${zoneId}/dns_records?type=${rec.type}&name=${encodeURIComponent(name)}`);
  if (existing.result.length > 0) {
    const id = existing.result[0].id;
    return cfFetch(`/zones/${zoneId}/dns_records/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        type: rec.type,
        name,
        content: rec.value,
        ttl: rec.ttl || 3600
      })
    });
  } else {
    return cfFetch(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: rec.type,
        name,
        content: rec.value,
        ttl: rec.ttl || 3600
      })
    });
  }
}

async function main() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!zoneId) throw new Error('CLOUDFLARE_ZONE_ID not set');
  const data = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  if (data.domain !== 'nicheweb.dev') throw new Error('registry.json domain must be nicheweb.dev');
  for (const rec of data.records) {
    console.log(`Sync ${rec.subdomain}.${data.domain} ${rec.type} -> ${rec.value}`);
    await upsertRecord(zoneId, rec);
  }
  console.log('Sync complete');
}

main().catch(err => { console.error(err); process.exit(1); });
