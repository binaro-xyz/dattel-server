const fs = require('fs-extra');
const path = require('path');
const config = require('../../config.json');
const glob = require('glob');

const getSites = () => {
    const site_config_paths = glob.sync('*/site.json', { cwd: config.deploy_folder, dot: false });

    return site_config_paths.reduce((acc, config_path) => {
        const site_id = path.dirname(config_path);
        const config = configForSite(site_id);
        if (config) acc[site_id] = config;
        return acc;
    }, {});
};

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
    getSites,
    siteExists,
    siteConfigPath,
    configForSite,
    updateConfigForSite,
};
