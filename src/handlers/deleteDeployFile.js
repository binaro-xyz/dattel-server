const r = require('../util/r');
const deploys = require('../util/deploys');
const fs = require('fs-extra');

module.exports = async (request, h) => {
    const { site_id, deploy_id, dest_path } = request.params;

    try {
        fs.removeSync(deploys.safePathInDeploy(site_id, deploy_id, dest_path));

        return r(h, 'Successfully deleted file.', 201);
    } catch (err) {
        console.error(err);
        return r(h, 'Deleting failed.', 500);
    }
};
