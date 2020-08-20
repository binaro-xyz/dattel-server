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
        validate: async (request, token, h) => ({ isValid: token === config.auth_token, credentials: { token } }),
    });
    server.auth.default('simple');

    // Routes
    server.route({
        method: 'PUT',
        path: '/site',
        handler: require('./handlers/site/createSite'),
        options: {
            validate: {
                payload: Joi.object({
                    site_id: j.types.new_site_id.required(),
                    domains: Joi.array().items(Joi.string().hostname()).required(),
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
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                }),
            },
        },
    });
    server.route({
        method: 'PUT',
        path: '/site/{site_id}/deploy/{deploy_id}/file/{dest_path*}',
        handler: require('./handlers/deploy/uploadDeployFile'),
        options: {
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                    deploy_id: j.types.deploy_id.required(),
                    dest_path: Joi.string().pattern(/[^\0]/).required(),
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
        path: '/site/{site_id}/deploy/{deploy_id}/file/{dest_path*}',
        handler: require('./handlers/deploy/deleteDeployFile'),
        options: {
            validate: {
                params: Joi.object({
                    site_id: j.types.site_id.required(),
                    deploy_id: j.types.deploy_id.required(),
                    dest_path: Joi.string().pattern(/[^\0]/).required(),
                }),
            },
        },
    });
    server.route({
        method: 'POST',
        path: '/site/{site_id}/deploy/{deploy_id}/publish',
        handler: require('./handlers/deploy/publishDeploy'),
        options: {
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
