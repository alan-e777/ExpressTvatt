/**
 * The site's own public address.
 *
 * For links that leave the browser and land in someone else's inbox, the host
 * the admin happened to be on is the wrong answer. The customer CSV is
 * downloaded from wherever the admin is working — `localhost:3001`, a Vercel
 * preview, the live site — and its unsubscribe links go straight into a
 * marketing email. Derived from the request, an export done from a dev machine
 * would ship a campaign where every unsubscribe link points at `localhost` and
 * fails for every recipient.
 *
 * So this is the live domain by default, not a guess from the request.
 *
 * `NEXT_PUBLIC_SITE_URL` overrides it, which is only wanted on a real staging
 * deployment that sends its own mail. Setting it locally would re-create the
 * problem above, so leave it unset in development.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://expresstvatt.se').replace(/\/+$/, '');
