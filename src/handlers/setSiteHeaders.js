const config = require('../../config.json');
const r = require('../util/r');
const caddy = require('../util/caddy');
const deploys = require('../util/deploys');

const fs = require('fs-extra');
const path = require('path');

module.exports = async (request, h) => {
    const { site_id } = request.params;
    const site_dir = path.join(config.deploy_folder, site_id);

    // Sanity check.
    if (!fs.existsSync(site_dir)) return r(h, `Site with ID '${site_id} doesn't exist.'`, 404);

    try {
        // Generate the new route definition and load it into Caddy.
        const header_rules = request.payload;
        await caddy.PATCH(
            `/id/subroute-${site_id}/routes`,
            caddy.routeDefinition({
                site_id,
                deploy_folder: await deploys.liveDeployDir(site_id),
                header_rules,
            })
        );

        return r(h, `Successfully set headers for site with ID '${site_id}'.`, 200);
    } catch (err) {
        console.error(err);
        return r(h, `Setting headers for site with ID '${site_id}' failed.`, 500);
    }
};