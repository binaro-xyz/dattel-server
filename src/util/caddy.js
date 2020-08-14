const bent = require('bent');

const config = require('../../config.json');

const request = (method, response_type = 'string') => bent(method, response_type, [200, 201], config.caddy_api_url);
const GET = request('GET', 'json');
const POST = request('POST');
const PATCH = request('PATCH');
const PUT = request('PUT');
const DELETE = request('DELETE');

module.exports = {
    GET,
    POST,
    PATCH,
    PUT,
    DELETE,
};
