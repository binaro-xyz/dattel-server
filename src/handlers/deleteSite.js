const config = require('../../config.json');
const r = require('../util/r');
const caddy = require('../util/caddy');
const { liveDeployDir } = require('../util/deploys');

const fs = require('fs-extra');
const path = require('path');
const { nanoid } = require('nanoid');

module.exports = async (request, h) => {
    const { site_id } = request.params;
    const { delete_token } = request.payload || {};
    const site_dir = path.join(config.deploy_folder, site_id);

    // Sanity check.
    if (!fs.existsSync(site_dir)) return r(h, `Site with ID '${site_id} doesn't exist.'`, 404);

    const live_deploy_dir = await liveDeployDir(site_id);
    const token_file = path.join(live_deploy_dir, '.dattel-delete-token');

    // To avoid unintentional deletes, create a file with a delete token in the webroot.
    if (!delete_token) {
        if (!fs.existsSync(token_file)) fs.writeFileSync(token_file, nanoid());
        return r(
            h,
            `To avoid unintentional deletes, a delete token is required. Please retrieve it from /.dattel-delete-token and retry.`,
            403
        );
    }

    // Validate the delete token.
    const correct_delete_token = fs.existsSync(token_file) && fs.readFileSync(token_file).toString();
    if (delete_token !== correct_delete_token) return r(h, 'Invalid delete token.', 403);

    // Actually do the deletion.
    await caddy.DELETE(`/id/route-${site_id}`);
    fs.removeSync(site_dir);

    return r(h, `Successfully deleted site with ID '${site_id}'.`, 200);
};
