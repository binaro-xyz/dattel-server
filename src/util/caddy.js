const bent = require('bent');

const config = require('../../config.json');
const sites = require('./sites');

const request = (method, response_type = 'string') => {
    return function (...args) {
        return bent(
            method,
            response_type,
            [200, 201],
            config.caddy_api_url
        )(...args).catch(async (err) => {
            console.error('Request failed.', err, [method, ...args]);
            if (err.json) console.log(await err.json());
            process.exit(1);
        });
    };
};
const GET = request('GET', 'json');
const POST = request('POST');
const PATCH = request('PATCH');
const PUT = request('PUT');
const DELETE = request('DELETE');

const domainsInUse = async () =>
    (await GET('/config/apps/http/servers/srv0/routes'))
        .map((r) => r.match)
        .flat()
        .map((m) => m.host)
        .flat();

const routeDefinition = (site_id, { live_deploy_dir, domains = [], header_rules = {}, redirect_rules = [] }) => {
    const custom_header_routes = Object.entries(header_rules).map(([path_matcher, headers]) => ({
        handle: [
            {
                handler: 'headers',
                response: { set: headers },
            },
        ],
        match: [{ path: [path_matcher] }],
    }));
    const custom_redirect_routes = redirect_rules.map((r) => ({
        handle: [
            {
                handler: 'static_response',
                headers: { Location: [r.to.replace(':splat', '{http.request.uri}')] },
                status_code: 301,
            },
        ],
        match: [{ [r.host ? 'host' : 'path']: [r.host || r.path] }],
    }));
    return {
        '@id': `route-${site_id}`,
        match: [{ host: domains }],
        handle: [
            {
                '@id': `subroute-${site_id}`,
                handler: 'subroute',
                routes: [
                    { handle: [{ handler: 'vars', root: live_deploy_dir }] },
                    ...custom_header_routes,
                    {
                        handle: [
                            {
                                '@id': `default-headers-${site_id}`,
                                handler: 'headers',
                                response: {
                                    add: {
                                        'Cache-Control': ['public, max-age=0, must-revalidate'],
                                    },
                                    set: {
                                        Server: ['dattel-fueled Caddy'],
                                    },
                                },
                            },
                        ],
                    },
                    ...custom_redirect_routes,
                    {
                        handle: [
                            { encodings: { gzip: {}, zstd: {} }, handler: 'encode' },
                            { '@id': `files-${site_id}`, handler: 'file_server', canonical_uris: false },
                        ],
                    },
                ],
            },
        ],
        terminal: true,
    };
};

const createSite = async (site_id) => {
    const site_config = sites.configForSite(site_id);
    const route_definition = routeDefinition(site_id, site_config);
    await POST('/config/apps/http/servers/srv0/routes', route_definition);
};
const loadNewSiteConfig = async (site_id) => {
    const site_config = sites.configForSite(site_id);
    const route_definition = routeDefinition(site_id, site_config);
    await PATCH(`/id/route-${site_id}`, route_definition);
};

const base_caddy_conf = {
    apps: {
        http: {
            servers: {
                srv0: {
                    // We explicitly _don't_ want to listen on `:80`, otherwise Caddy will not automatically redirect
                    // HTTP to HTTPS
                    // (https://vaibhavkaushal.com/posts/2025/Caddy-automatic-redirect-to-HTTPS-is-not-working).
                    listen: [':443'],
                    routes: [
                        // Forward Let's Encrypt challenge requests to our second Caddy instance. *sigh*
                        {
                            match: [{ host: [config.api_domain] }],
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

module.exports = {
    GET,
    POST,
    PATCH,
    PUT,
    DELETE,

    domainsInUse,

    routeDefinition,
    createSite,
    loadNewSiteConfig,

    base_caddy_conf,
};
