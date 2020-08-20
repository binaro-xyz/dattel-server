const fs = require('fs-extra');
const path = require('path');
const r = require('../../util/r');
const config = require('../../../config.json');
const { liveDeployDir } = require('../../util/deploys');

// TODO: Unlike the other deploy-related actions, this doesn't take a deploy ID but rather generically removes all
// deploys other than the one that is currently live.
// While this is fine for now, given that there can only be one deploy in progress at a time, this may need to change in
// the future.
module.exports = async (request, h) => {
    const { site_id } = request.params;
    const site_dir = path.join(config.deploy_folder, site_id);

    // Sanity check.
    const lock_file = path.join(site_dir, 'deploy_lock');
    if (!fs.existsSync(lock_file)) {
        return r(h, `Cannot cancel in-progress deploy for site ${site_id} as there is none.`, 404);
    }

    const live_deploy_dir = path.resolve(await liveDeployDir(site_id));
    const non_live_deploys = fs
        .readdirSync(site_dir, { withFileTypes: true })
        .filter((f) => f.isDirectory())
        .map((d) => path.resolve(site_dir, d.name))
        .filter((d) => d !== live_deploy_dir);

    for (const dir of non_live_deploys) fs.removeSync(dir);
    fs.removeSync(path.join(site_dir, 'deploy_lock'));

    return r(h, `Successfully cancelled in-progress deploy for site ${site_id}.`, 200);
};
