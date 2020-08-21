const config = require('../../../config.json');
const r = require('../../util/r');
const caddy = require('../../util/caddy');
const sites = require('../../util/sites');
const { haveCommonElements } = require('../../util/util');

const fs = require('fs-extra');
const path = require('path');

module.exports = async (request, h) => {
    const { site_id, domains } = request.payload;
    const site_dir = path.join(config.deploy_folder, site_id);

    // Sanity checks.
    if (sites.siteExists(site_dir)) return r(h, `Site with ID '${site_id}' already exists.`, 409);
    if (haveCommonElements(await caddy.domainsInUse(), domains)) {
        return r(h, 'At least one domain is already in use.', 409);
    }

    // Create a first deploy.
    const first_deploy_dir = path.join(site_dir, Date.now().toString());
    fs.ensureDirSync(first_deploy_dir);
    fs.writeFileSync(path.join(first_deploy_dir, 'index.html'), `Coming soon to a dattel near you: ${site_id}`);

    const site_config = {
        live_deploy_dir: first_deploy_dir,
        domains,
        header_rules: {},
        redirect_rules: [],
    };
    fs.writeFileSync(path.join(site_dir, 'site.json'), JSON.stringify(site_config));
    await caddy.createSite(site_id);

    return r(
        h,
        `Successfully created site with ID '${site_id}' and domain${domains.length > 1 ? 's' : ''} ${domains
            .map((d) => `'${d}'`)
            .join(', ')}.`,
        201
    );
};
