const config = require('../config.json');
const caddy = require('./util/caddy');
const fs = require('fs-extra');

let caddy_conf = {
    apps: {
        http: {
            servers: {
                srv0: {
                    listen: [':80', ':443'],
                    routes: [],
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
