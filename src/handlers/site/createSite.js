const config = require('../../../config.json');
const r = require('../../util/r');
const caddy = require('../../util/caddy');
const sites = require('../../util/sites');
const bunny = require('../../util/bunny');
const { haveCommonElements } = require('../../util/util');

const fs = require('fs-extra');
const path = require('path');

module.exports = async (request, h) => {
    const { site_id, domains, enable_cdn, bunny_pricing_type } = request.payload;
    const site_dir = path.join(config.deploy_folder, site_id);

    // Sanity checks.
    if (sites.siteExists(site_dir)) return r(h, `Site with ID '${site_id}' already exists.`, 409);
    if (haveCommonElements(await caddy.domainsInUse(), domains)) {
        return r(h, 'At least one domain is already in use.', 409);
    }

    try {
        // Create a first deploy.
        const first_deploy_dir = path.join(site_dir, Date.now().toString());
        fs.ensureDirSync(first_deploy_dir);
        fs.writeFileSync(path.join(first_deploy_dir, 'index.html'), `Coming soon to a dattel near you: ${site_id}`);

        const site_config = {
            live_deploy_dir: first_deploy_dir,
            domains: enable_cdn ? [`${site_id}.${config.wildcard_domain}`] : domains,
            header_rules: {},
            redirect_rules: [],
            bunny_pull_zone_id: null,
        };

        // Register a new pull zone with BunnyCDN if requested.
        if (enable_cdn) {
            const bunny_details = await bunny.createPullZone(
                site_id,
                bunny_pricing_type,
                `https://${site_config.domains[0]}`
            );

            // TODO: Make (some of) these options configurable.
            await bunny.updatePullZone(bunny_details.data.Id, {
                EnableGeoZoneUS: false,
                EnableGeoZoneASIA: false,
                EnableGeoZoneSA: false,
                EnableGeoZoneAF: false,
                EnableAccessControlOriginHeader: false,
                EnableLogging: false,
                DisableCookies: false,
                CacheControlMaxAgeOverride: 86400,
                // TODO: We should discuss if allowing the browser to cache the files for a couple of minutes might be
                // a reasonable trade-off between greatly minimizing the requests and still allowing for quick updates.
                // If we decide to implement this, the respective value should also be changed in the Caddy config.
                CacheControlBrowserMaxAgeOverride: 0,
            });

            const hostname_adders = domains.map(async (d) => await bunny.addPullZoneHostname(bunny_details.data.Id, d));
            await Promise.all(hostname_adders);

            site_config.bunny_pull_zone_id = bunny_details.data.Id;
        }

        fs.writeFileSync(path.join(site_dir, 'site.json'), JSON.stringify(site_config));
        await caddy.createSite(site_id);
    } catch (err) {
        if (err.response.data && err.response.data.ErrorKey === 'pullzone.name_taken') {
            return r(h, `A Bunny pull zone named '${site_id}' already exists. Please choose another site ID.`, 409);
        }

        console.error(err);
        return r(h, `Creating site with ID '${site_id}' failed.`, 500);
    }

    return r(h, `Successfully created site with ID '${site_id}'.`, 201);
};
