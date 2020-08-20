const config = require('../../../config.json');
const r = require('../../util/r');
const caddy = require('../../util/caddy');
const { haveCommonElements } = require('../../util/util');

const fs = require('fs-extra');
const path = require('path');

module.exports = async (request, h) => {
    const { site_id, domains } = request.payload;
    const site_dir = path.join(config.deploy_folder, site_id);

    // Sanity checks.
    if (fs.existsSync(site_dir)) return r(h, `Site with ID '${site_id} already exists.'`, 409);
    const existing_routes = await caddy.GET('/config/apps/http/servers/srv0/routes');
    const existing_domains = existing_routes
        .map((r) => r.match)
        .flat()
        .map((m) => m.host)
        .flat();
    if (haveCommonElements(existing_domains, domains)) return r(h, 'At least one domain is already in use.', 409);

    // Create a first deploy.
    const first_deploy_folder = path.join(site_dir, Date.now().toString());
    fs.ensureDirSync(first_deploy_folder);
    fs.writeFileSync(path.join(first_deploy_folder, 'index.html'), `Coming soon to a dattel near you: ${site_id}`);

    // Load the new site in Caddy.
    const route = {
        '@id': `route-${site_id}`,
        match: [{ host: domains }],
        handle: [
            {
                '@id': `subroute-${site_id}`,
                handler: 'subroute',
                routes: caddy.routeDefinition({ site_id, deploy_folder: first_deploy_folder }),
            },
        ],
        terminal: true,
    };
    await caddy.POST('/config/apps/http/servers/srv0/routes', route);

    return r(
        h,
        `Successfully created site with ID '${site_id}' and domain${domains.length > 1 ? 's' : ''} ${domains
            .map((d) => `'${d}'`)
            .join(', ')}.`,
        201
    );
};
