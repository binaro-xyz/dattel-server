const bent = require('bent');

const config = require('../../config.json');

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

const routeDefinition = ({ site_id, deploy_folder, header_rules = {}, redirect_rules = [] }) => {
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
    return [
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
        { handle: [{ '@id': `files-${site_id}`, handler: 'file_server', root: deploy_folder }] },
    ];
};

module.exports = {
    GET,
    POST,
    PATCH,
    PUT,
    DELETE,

    routeDefinition,
};
