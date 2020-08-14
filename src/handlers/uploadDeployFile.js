const r = require('../util/r');
const deploys = require('../util/deploys');
const fs = require('fs-extra');

module.exports = async (request, h) => {
    const { site_id, deploy_id, dest_path } = request.params;

    try {
        fs.copySync(request.payload.path, deploys.safePathInDeploy(site_id, deploy_id, dest_path));
        fs.removeSync(request.payload.path);

        return r(h, 'Successfully uploaded file.', 201);
    } catch (err) {
        console.error(err);
        fs.removeSync(request.payload.path);
        return r(h, 'Upload failed.', 500);
    }
};
