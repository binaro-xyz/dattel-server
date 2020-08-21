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
                    { handle: [{ '@id': `files-${site_id}`, handler: 'file_server', root: live_deploy_dir }] },
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
};
