# btrz-user-permissions

This is a simple module that enhances the `req.user` object with permissions methods.

## Manual installation and configuration

When creating a new API service you should include this module.
```bash
npm install btrz-user-permissions --save
```
On your index.js file when creating your application service, hook this package into the middleware:

```js
const Logger = require("btrz-logger").Logger;
const logger = new Logger();
const {SimpleDao} = require("btrz-simple-dao");
const {UserPermissions} = require("btrz-auth-api-key");

const simpleDao = new SimpleDao(config);

// Same config as btrz-auth-api-key
const userPermissions = new UserPermissions({simpleDao, logger}, config.authenticator);

app = express();

// btrz-auth-api-key needs to be initialized first
app.use(auth.initialize());
app.use(auth.authenticate());

// Enhance the user object with permissions
app.use(userPermissions.enhanceRequestUser());
```

## Simple Usage

Once initialized, the req.user object will now contain the methods `canRead`, `canCreate`, `canUpdate` and `canDelete`.

```js
handler(req, res) {
    validateSwaggerSchema(validator, this.getSpec(), models, req)
        .then(() => {
            if (!req.user.canRead("/admin/not/balrog")) {
                throw new ValidationError("UNAUTHORIZED", "You shall not pass!");
            }
            return Commands.canContinueOn(exampleData);
        })
        .catch(MapErrors)
        .catch((err) => {
            responseHandlers.error(res, this.logger)(err);
        });
}
```