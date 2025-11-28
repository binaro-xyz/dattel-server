const config = require('../config.json');
const caddy = require('./util/caddy');
const fs = require('fs-extra');
const Confirm = require('prompt-confirm');

let caddy_conf = caddy.base_caddy_conf;
if (process.env.DATTEL_DEBUG)
    caddy_conf.apps.tls = { automation: { policies: [{ issuers: [{ module: 'internal' }] }] } };

async function main() {
    const prompt = new Confirm({ message: 'Are you *SURE* you really want to reset *EVERYTHING*?', default: false });
    const answer = await prompt.run();
    if (answer !== true) process.exit(1);

    await caddy.POST('/load', caddy_conf);

    fs.removeSync(config.deploy_folder);
    fs.ensureDirSync(config.deploy_folder);
}

main();
