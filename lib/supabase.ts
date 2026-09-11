import { createBrowserClient } from '@supabase/ssr';

const createSupabaseBrowserClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

let browserClient: ReturnType<typeof createSupabaseBrowserClient> | undefined;

export const createClientBrowser = () => {
  // A browser session needs one long-lived client. Recreating a client during
  // React renders also recreates its auth listener and refresh lifecycle,
  // making an inactive tab more likely to return with an expired access token.
  if (typeof window !== 'undefined' && browserClient) {
    return browserClient;
  }

  const client = createSupabaseBrowserClient();

  if (typeof window !== 'undefined') {
    browserClient = client;
  }

  return client;
};

