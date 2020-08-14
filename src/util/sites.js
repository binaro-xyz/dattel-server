const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');

module.exports = {
    siteExists: (site_id) => fs.existsSync(path.join(config.deploy_folder, site_id)),
};
