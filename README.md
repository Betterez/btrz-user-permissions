# btrz-user-permissions

This is a simple module that enhances the `req.user` object with permissions methods.

## Manual installation and configuration

When creating a new API service you should include this module.

    npm install btrz-user-permissions --save

On your index.js file when creating your application service, hook this package into the middleware:

    const Logger = require("btrz-logger").Logger;
    const logger = new Logger();
    const {SimpleDao} = require("btrz-simple-dao");
    const {UserPermissions} = require("btrz-auth-api-key");

    const simpleDao = new SimpleDao(options);

    const userPermissions = new UserPermissions({simpleDao, logger});
    
    app = express();

    // btrz-auth-api-key needs to be initialized first
    app.use(auth.initialize());
    app.use(auth.authenticate());

    // Enhance the user object with permissions
    app.use(userPermissions.initialize());
