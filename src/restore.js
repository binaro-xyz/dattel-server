/**
 * @file With this script, you can restore the Caddy config (as in completely recreate it from the already created
 * sites).
 *
 * On a properly set up server, this will (essentially) have no effect. It is only useful if your Caddy config somehow
 * get corrupted (e.g. if you accidentally started `caddy.service` instead of `caddy-api.service`) or if you manually
 * changed something.
 *
 * @note This does NOT deal with:
 *  - The site configs and files
 *  - CDN configuration
 */
const caddy = require('./util/caddy');
const { getSites } = require('./util/sites');
const Confirm = require('prompt-confirm');

let caddy_conf = caddy.base_caddy_conf;
if (process.env.DATTEL_DEBUG)
    caddy_conf.apps.tls = { automation: { policies: [{ issuers: [{ module: 'internal' }] }] } };

async function main() {
    const prompt = new Confirm({
        message:
            'This will recreate the Caddy config. This should be a safe operation but might cause a short downtime. Do you want to continue?',
        default: false,
    });
    const answer = await prompt.run();
    if (answer !== true) process.exit(1);

    await caddy.POST('/load', caddy_conf);

    const sites = getSites();
    for (const site_id of Object.keys(sites)) {
        console.log(`Restoring Caddy config for site '${site_id}'…`);
        await caddy.createSite(site_id);
    }
}

main();
