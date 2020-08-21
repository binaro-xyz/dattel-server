const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');

siteExists = (site_id) => fs.existsSync(path.join(config.deploy_folder, site_id));
siteConfigPath = (site_id) => path.join(config.deploy_folder, site_id, 'site.json');

configForSite = (site_id) => {
    try {
        return JSON.parse(fs.readFileSync(siteConfigPath(site_id)).toString());
    } catch (err) {
        console.error(`Loading config for site ${site_id} failed:`, err);
        return undefined;
    }
};
updateConfigForSite = (site_id, overrides) => {
    const previous_config = configForSite(site_id);
    const new_config = { ...previous_config, ...overrides };
    fs.writeFileSync(siteConfigPath(site_id), JSON.stringify(new_config));
};

module.exports = {
    siteExists,
    siteConfigPath,
    configForSite,
    updateConfigForSite,
};
