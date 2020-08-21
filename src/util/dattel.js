const sites = require('./sites');
const caddy = require('./caddy');

const updateSiteConfig = async (site_id, overrides) => {
    sites.updateConfigForSite(site_id, overrides);
    await caddy.loadNewSiteConfig(site_id);
};

module.exports = {
    updateSiteConfig,
};
