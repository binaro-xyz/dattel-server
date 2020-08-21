const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const hasha = require('hasha');
const r = require('../../util/r');
const config = require('../../../config.json');
const { liveDeployDir } = require('../../util/deploys');

module.exports = async (request, h) => {
    const { site_id } = request.params;
    const site_dir = path.join(config.deploy_folder, site_id);

    // Sanity checks.
    const lock_file = path.join(site_dir, 'deploy_lock');
    if (fs.existsSync(lock_file)) {
        return r(h, `Cannot start deploy for site ${site_id}. Another one is already in progress.`, 409);
    }

    // Create the dir for the new deploy.
    const deploy_id = Date.now().toString();
    const deploy_dir = path.join(site_dir, deploy_id);

    try {
        fs.writeFileSync(lock_file, deploy_id);

        fs.ensureDirSync(deploy_dir);
        fs.copySync(liveDeployDir(site_id), deploy_dir, {
            preserveTimestamps: true,
        });

        // TODO: This can and should be parallelized for better speed.
        const files = glob.sync('**/*', { cwd: deploy_dir, dot: true, nodir: true }).reduce(
            (acc, cur) => ({
                ...acc,
                [cur]: hasha.fromFileSync(path.join(deploy_dir, cur), { algorithm: 'md5' }),
            }),
            {}
        );

        return r(h, { message: 'Successfully created new deploy.', deploy: { id: deploy_id, files } }, 201);
    } catch (err) {
        console.error(err);
        fs.removeSync(lock_file);
        fs.removeSync(deploy_dir);
        return r(h, 'Failed to create new deploy.', 500);
    }
};
