const r = require('../../util/r');
const deploys = require('../../util/deploys');
const { base64Decode } = require('../../util/util');
const fs = require('fs-extra');

module.exports = async (request, h) => {
    const { site_id, deploy_id, base_64_dest_path } = request.params;
    const dest_path = base64Decode(base_64_dest_path);

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
