const caddy = require('./caddy');

module.exports = {
    liveDeployDir: (site_id) =>
        caddy
            .GET(`/id/route-${site_id}`)
            .then((r) => r.handle[0].routes[0].handle.find((h) => h.handler === 'file_server').root),
};
