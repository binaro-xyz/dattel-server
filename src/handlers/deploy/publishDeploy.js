const config = require('../../../config.json');
const deploys = require('../../util/deploys');
const dattel = require('../../util/dattel');
const sites = require('../../util/sites');
const bunny = require('../../util/bunny');
const r = require('../../util/r');
const path = require('path');
const fs = require('fs-extra');

module.exports = async (request, h) => {
    const { site_id, deploy_id } = request.params;
    const site_dir = path.join(config.deploy_folder, site_id);

    try {
        const previous_live_dir = deploys.liveDeployDir(site_id);
        const new_live_dir = path.join(site_dir, deploy_id);

        await dattel.updateSiteConfig(site_id, { live_deploy_dir: new_live_dir });

        // Delete all deploys other than the current and previous live one and the lock.
        const old_deploys = fs
            .readdirSync(site_dir, { withFileTypes: true })
            .filter((f) => f.isDirectory())
            .map((d) => path.resolve(site_dir, d.name))
            .filter((d) => ![previous_live_dir, new_live_dir].includes(d));

        for (const dir of old_deploys) fs.removeSync(dir);
        fs.removeSync(path.join(site_dir, 'deploy_lock'));

        // Purge the CDN cache if the CDN is enabled.
        const site_config = sites.configForSite(site_id);
        if (site_config.bunny_pull_zone_id) {
            // TODO: We may want to only purge the changed files in the future.
            await bunny.purgePullZoneCache(site_config.bunny_pull_zone_id);
        }

        return r(h, `Successfully published deploy '${deploy_id}' for site '${site_id}'.`, 200);
    } catch (err) {
        console.error(err);
        return r(h, `Publishing deploy '${deploy_id}' for site '${site_id}' failed.`, 500);
    }
};
