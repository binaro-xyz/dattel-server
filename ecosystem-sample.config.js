module.exports = {
    apps: [
        {
            name: 'dattel-server',
            script: 'src/index.js',
        },
    ],
    deploy: {
        production: {
            user: 'user',
            host: 'host',
            ref: 'origin/master',
            repo: 'https://github.com/binaro-xyz/dattel-server',
            path: '/home/dattel/server',
            'post-deploy': '/usr/bin/yarn',
        },
    },
};
