const config = require('../../config.json');
const deploys = require('../util/deploys');
const caddy = require('../util/caddy');
const r = require('../util/r');
const path = require('path');
const fs = require('fs-extra');

module.exports = async (request, h) => {
    const { site_id, deploy_id } = request.params;
    const site_dir = path.join(config.deploy_folder, site_id);

    try {
        // Tell Caddy to serve the new deploy.
        const previous_live_dir = await deploys.liveDeployDir(site_id);
        const new_live_dir = path.join(site_dir, deploy_id);
        await caddy.PATCH(`/id/route-${site_id}/handle/0/routes/0/handle/1`, {
            handler: 'file_server',
            root: new_live_dir,
        });

        // Delete all deploys other than the current and previous live one and the lock.
        const old_deploys = fs
            .readdirSync(site_dir, { withFileTypes: true })
            .filter((f) => f.isDirectory())
            .map((d) => path.resolve(site_dir, d.name))
            .filter((d) => ![previous_live_dir, new_live_dir].includes(d));

        for (const dir of old_deploys) fs.removeSync(dir);
        fs.removeSync(path.join(site_dir, 'deploy_lock'));

        return r(h, `Successfully published deploy '${deploy_id}' for site '${site_id}'.`, 200);
    } catch (err) {
        console.error(err);
        return r(h, `Publishing deploy '${deploy_id}' for site '${site_id}' failed.`, 500);
    }
};
