const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const j = require('./util/joi');

const init = async () => {
    const server = Hapi.server({
        port: 3000,
        host: '0.0.0.0',
        routes: {
            validate: {
                failAction: async function (request, h, err) {
                    // TODO: Since we currently only have one (admin) user, it should be fine to always return the full
                    // error in the response.
                    // If the that changes in the future, see: https://github.com/hapijs/hapi/issues/3706
                    throw err;
                },
            },
        },
    });

    // Bearer token auth
    await server.register(require('hapi-auth-bearer-token'));
    server.auth.strategy('simple', 'bearer-access-token', {
        validate: async (request, token, h) => {
            // The general `auth_token` gets the `root` scope, it can do everything.
            if (token === config.auth_token) return { isValid: true, credentials: { token, scope: 'root' } };

            // We also have site-specific deploy tokens that can only deploy to that site.
            const site_id = request.params.site_id;
            if (site_id) {
                const deploy_token = config.deploy_tokens?.[site_id];
                if ((deploy_token?.length || 0) > 20 && token === deploy_token)
                    return { isValid: true, credentials: { token, scope: `deploy::${site_id}` } };
            }

            return { isValid: false, credentials: { token } };
        },
    });

    // By default, all routes can only be accessed with a valid token with the `root` scope (i.e. the general
    // `config.auth_token`).
    server.auth.default({
        strategy: 'simple',
        access: {
            scope: ['root'],
        },
    });
    // Auth config for deploy methods. These can be accessed by the `root` scope (wíth the general `config.auth_token`)
    // or with the site-specific `deploy-<site_id>` scope (with the site-specific token from `config.deploy_tokens`).
    const deploy_auth = {
        strategy: 'simple',
        access: {
            scope: ['root', 'deploy::{params.site_id}'],
        },
    };

    // Routes
    server.route({
        method: 'PUT',
        path: '/site',
        handler: require('./handlers/site/createSite'),
        options: {
            validate: {
                payload: Joi.object({
                    site_id: j.types.new_site_id.required(),
                    enable_cdn: Joi.boolean().default(true),
                    // If `enable_cdn` is true, the domains will be added to the BunnyCDN zone, otherwise Caddy will
                    // handle them.
                    domains: Joi.array().items(Joi.string().hostname()).required(),
                    // 0 is standard, 1 is high volume.
                    bunny_pricing_type: Joi.number().allow(0, 1).default(0),
                }),
            },
        },
    });

    server.route({
        method: 'DELETE',
        path: '/site/{site_id}',
        handler: require('./handlers/site/deleteSite'),
        options: {
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                }),
                payload: Joi.object({
                    delete_token: Joi.string().pattern(/[A-Za-z0-9_\-]{21}/),
                }).allow(null),
            },
        },
    });

    server.route({
        method: 'PATCH',
        path: '/site/{site_id}/headers',
        handler: require('./handlers/site/setSiteHeaders'),
        options: {
            auth: deploy_auth,
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                }),
                payload: Joi.object({
                    headers: Joi.object().unknown(),
                    redirects: Joi.array().items(
                        Joi.object({
                            status: Joi.number().allow(301, 302).required(),
                            path: Joi.string().pattern(/^\/.+$/),
                            host: Joi.string().hostname(),
                            to: Joi.string(),
                        })
                    ),
                }),
            },
        },
    });

    server.route({
        method: 'PUT',
        path: '/site/{site_id}/deploy',
        handler: require('./handlers/deploy/startDeploy'),
        options: {
            auth: deploy_auth,
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                }),
            },
        },
    });
    server.route({
        method: 'DELETE',
        path: '/site/{site_id}/deploy',
        handler: require('./handlers/deploy/cancelDeploy'),
        options: {
            auth: deploy_auth,
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                }),
            },
        },
    });
    server.route({
        method: 'PUT',
        path: '/site/{site_id}/deploy/{deploy_id}/file/{base_64_dest_path*}',
        handler: require('./handlers/deploy/uploadDeployFile'),
        options: {
            auth: deploy_auth,
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                    deploy_id: j.types.deploy_id.required(),
                    base_64_dest_path: Joi.string().base64().required(),
                }),
                payload: Joi.object({
                    path: Joi.string().required(),
                    bytes: Joi.number().required(),
                }),
            },
            payload: {
                output: 'file',
                maxBytes: 1024 * 1024 * 1024,
                parse: true,
            },
        },
    });
    server.route({
        method: 'DELETE',
        path: '/site/{site_id}/deploy/{deploy_id}/file/{base_64_dest_path*}',
        handler: require('./handlers/deploy/deleteDeployFile'),
        options: {
            auth: deploy_auth,
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                    deploy_id: j.types.deploy_id.required(),
                    base_64_dest_path: Joi.string().base64().required(),
                }),
            },
        },
    });
    server.route({
        method: 'POST',
        path: '/site/{site_id}/deploy/{deploy_id}/publish',
        handler: require('./handlers/deploy/publishDeploy'),
        options: {
            auth: deploy_auth,
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                    deploy_id: j.types.deploy_id.required(),
                }),
            },
        },
    });

    await server.start();
    console.log('Server running on', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.error('An unhandled promise rejection occurred:', err);
    // PM2 will auto-restart in this case.
    // TODO: We should probably be informed about this somehow.
    process.exit(1);
});

let config;
try {
    config = require('../config.json');
} catch (_) {
    console.error(
        'Invalid or missing configuration. Please copy `config-sample.json` to `config.json` and change the values as needed.'
    );
    process.exit(1);
}

init();
