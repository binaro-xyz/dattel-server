const caddy = require('./caddy');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');

module.exports = {
    deployExists: (site_id, deploy_id) => fs.existsSync(path.join(config.deploy_folder, site_id, deploy_id)),
    deployInProgressId: (site_id) => {
        const lock_file = path.join(config.deploy_folder, site_id, 'deploy_lock');
        if (!fs.existsSync(lock_file)) return undefined;
        return fs.readFileSync(lock_file).toString();
    },
    liveDeployDir: (site_id) =>
        caddy
            .GET(`/id/route-${site_id}`)
            .then((r) => r.handle[0].routes[0].handle.find((h) => h.handler === 'file_server').root),

    // See: https://nodejs.org/en/knowledge/file-system/security/introduction/#preventing-directory-traversal
    safePathInDeploy: (site_id, deploy_id, file_path) => {
        const deploy_path = path.join(config.deploy_folder, site_id, deploy_id, '/');
        file_path = path.join(deploy_path, path.normalize(file_path));
        if (file_path.startsWith(deploy_path) && !/\0/.test(file_path)) return file_path;
        return undefined;
    },
};
