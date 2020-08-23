const config = require('../config.json');
const caddy = require('./util/caddy');
const fs = require('fs-extra');

if (!process.argv[2]) {
    console.error(
        'Please specify the domain you want the API to be available as a parameter: node',
        process.argv[1],
        'api.mydomain.tld'
    );
    process.exit(1);
}

let caddy_conf = {
    apps: {
        http: {
            servers: {
                srv0: {
                    listen: [':80', ':443'],
                    routes: [
                        // Forward Let's Encrypt challenge requests to our second Caddy instance. *sigh*
                        {
                            match: [{ host: [process.argv[2]] }],
                            handle: [
                                {
                                    handler: 'subroute',
                                    routes: [
                                        {
                                            handle: [
                                                { handler: 'reverse_proxy', upstreams: [{ dial: '127.0.0.1:8080' }] },
                                            ],
                                        },
                                    ],
                                },
                            ],
                            terminal: true,
                        },
                    ],
                    errors: {
                        routes: [
                            {
                                handle: [
                                    {
                                        handler: 'subroute',
                                        routes: [
                                            { handle: [{ handler: 'rewrite', uri: '/{http.error.status_code}.html' }] },
                                            { handle: [{ handler: 'file_server', pass_thru: true }] },
                                            {
                                                handle: [
                                                    {
                                                        handler: 'static_response',
                                                        status_code: '{http.error.status_code}',
                                                        body:
                                                            '{http.error.status_text} (Error {http.error.status_code})',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                                terminal: true,
                            },
                        ],
                    },
                },
            },
        },
    },
};
if (process.env.DATTEL_DEBUG) caddy_conf.apps.tls = { automation: { policies: [{ issuer: { module: 'internal' } }] } };

async function main() {
    await caddy.POST('/load', caddy_conf);

    fs.removeSync(config.deploy_folder);
    fs.ensureDirSync(config.deploy_folder);
}

main();
