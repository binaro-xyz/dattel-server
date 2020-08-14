const Hapi = require('@hapi/hapi');
const Joi = require('joi');

const init = async () => {
    const server = Hapi.server({
        port: 3000,
        host: '0.0.0.0',
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
        handler: require('./handlers/createSite'),
        options: {
            validate: {
                payload: Joi.object({
                    site_id: Joi.string().required().token(),
                    domain: Joi.string().required().hostname(),
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
