const Joi = require('joi');
const sites = require('./sites');
const deploys = require('./deploys');

const t = (m) => {
    throw new Error(m);
};

const NEW_SITE_ID = Joi.string().pattern(/^[a-z0-9\-]+$/);

module.exports = {
    types: {
        new_site_id: NEW_SITE_ID,
        site_id: NEW_SITE_ID.custom((site_id, helpers) => {
            if (!sites.siteExists(site_id)) throw new Error(`site with ID '${site_id}' doesn't exist.`);
            return site_id;
        }, 'site actually exists'),
        deploy_id: Joi.date()
            .timestamp('javascript')
            .custom((deploy_id, helpers) => {
                // Otherwise, Joi will turn this into a `Date` object.
                deploy_id = helpers.original;

                // Verify the deploy actually exists.
                const site_id =
                    helpers.state.ancestors && helpers.state.ancestors[0] && helpers.state.ancestors[0].site_id;
                if (!deploys.deployExists(site_id, deploy_id)) {
                    t(`deploy '${deploy_id}' doesn't exist for site ${site_id}.`);
                }

                // Verify this is not the live deploy.
                if (deploy_id === deploys.liveDeployDir(site_id)) t('deploying to the live deploy is not allowed.');

                // Verify this is the deploy for which the lock was acquired.
                if (deploy_id !== deploys.deployInProgressId(site_id)) t('this is a stale deploy.');

                return deploy_id;
            }, 'deploy actually exists'),
    },
};
