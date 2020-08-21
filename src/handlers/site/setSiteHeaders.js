const config = require('../../../config.json');
const r = require('../../util/r');
const dattel = require('../../util/dattel');

const fs = require('fs-extra');
const path = require('path');

module.exports = async (request, h) => {
    const { site_id } = request.params;
    const site_dir = path.join(config.deploy_folder, site_id);
    const { headers = [], redirects = {} } = request.payload;

    // Sanity check.
    if (!fs.existsSync(site_dir)) return r(h, `Site with ID '${site_id} doesn't exist.'`, 404);

    try {
        await dattel.updateSiteConfig(site_id, {
            header_rules: headers,
            redirect_rules: redirects,
        });

        return r(h, `Successfully set headers and redirects for site with ID '${site_id}'.`, 200);
    } catch (err) {
        console.error(err);
        return r(h, `Setting headers and redirects for site with ID '${site_id}' failed.`, 500);
    }
};
