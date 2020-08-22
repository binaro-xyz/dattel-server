const rax = require('retry-axios');
const _axios = require('axios').default;

const config = require('../../config.json');

const ax = _axios.create({ baseURL: 'https://bunnycdn.com/api' });
ax.defaults.headers.common['AccessKey'] = config.bunny_token;
ax.defaults.raxConfig = { instance: ax };
rax.attach(ax);

const createPullZone = (name, pricing_type, origin_url) =>
    ax.post('/pullzone', { Name: name, Type: pricing_type, OriginUrl: origin_url });
const updatePullZone = (id, options) => ax.post(`/pullzone/${id}`, options);
const addPullZoneHostname = (id, hostname) => ax.post('/pullzone/addHostname', { PullZoneId: id, Hostname: hostname });
const deletePullZone = (id) => ax.delete(`/pullzone/${id}`);

const purgePullZoneCache = (id) => ax.post(`/pullzone/${id}/purgeCache`);
const purgeUrlCache = (url) => ax.post(`/purge?url=${url}`);

module.exports = {
    createPullZone,
    updatePullZone,
    addPullZoneHostname,
    deletePullZone,
    purgePullZoneCache,
    purgeUrlCache,
};
