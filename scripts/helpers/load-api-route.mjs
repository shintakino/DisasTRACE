import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

/** Run actual route code with explicit, in-memory IO; never opens the configured DB. */
export async function loadApiRoute(entry, dependencies) {
  const mocks = {
    '@/db': 'export const db = globalThis.dependencies.db;',
    '@/lib/supabase-server': 'export const createClient = async () => globalThis.dependencies.supabase; export const createAdminClient = () => globalThis.dependencies.admin;',
    '@/lib/push-notifications': 'export const sendSystemAnnouncementPush = (...args) => globalThis.dependencies.push(...args); export const sendDispatchOfferPush = async () => {};',
    '@/lib/dispatch-engine': 'export const cascadeIncident = async () => {}; export const calculateHaversineDistance = () => 1; export const checkAndCascadeExpiredOffers = async () => {}; export const notifyPaccAndCdrrmo = async () => {};',
    'next/server': 'export const NextResponse = { json: (body, init) => Response.json(body, init) };',
  };
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external',
    plugins: [{ name: 'route-io', setup(builder) {
      builder.onResolve({ filter: /^@\/|^next\/server$/ }, args => {
        if (mocks[args.path]) return { path: args.path, namespace: 'test' };
        const absolute = resolve(args.path.slice(2));
        if (extname(absolute) && existsSync(absolute)) return { path: absolute };
        return { path: existsSync(`${absolute}.ts`) ? `${absolute}.ts` : resolve(absolute, 'index.ts') };
      });
      builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: mocks[args.path] }));
    } }],
  });
  const exports = {};
  const context = vm.createContext({ dependencies, exports, module: { exports }, require: createRequire(import.meta.url),
    Request, Response, File, FormData, Buffer, URL, AbortController, setTimeout, clearTimeout, process,
    console: { ...console, error() {} },
  });
  vm.runInContext(result.outputFiles[0].text, context);
  return context.module.exports;
}
