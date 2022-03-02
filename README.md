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
            if (!req.user || !req.user.canRead("/admin/not/balrog")) {
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

## Auto completion and simpel documentation

If you ever find the need of not having to look up the documentation for the permissions methods, you can import the UserRequest type from this module.

This will also give you some docs for req.user and req.account objects.

```js
module.exports = {
  /**
   * @param {import("btrz-simple-dao/src/simple-dao").SimpleDao} dao
   * @param {import("btrz-api-client/types/initializedClient")} apiClient
   * @param {import("btrz-user-permissions").UserRequest} req
   */
  async someAwesomeCommand(dao, apiClient, req) {
    // Now this will autocomplete!
    if (!req.user || !req.user.canRead("/admin/not/balrog")) {
      throw new ValidationError("UNAUTHORIZED", "You shall not pass!");
    }
    return Commands.canContinueOn(exampleData);
  }
}
```

or you can get fancy with it and declare the types once and use them multiple times in your code:


```js
/**
 * @typedef {import("btrz-simple-dao/src/simple-dao").SimpleDao} SimpleDao
 * @typedef {import("btrz-api-client/types/initializedClient")} ApiClient
 * @typedef {import("btrz-user-permissions").UserRequest} UserRequest
 */

module.exports = {

  /// Some lines of awesome code and many repeats later...

  /**
   * @param {SimpleDao} dao
   * @param {ApiClient} apiClient
   * @param {UserRequest} req
   */
  async someAwesomeCommand(dao, apiClient, req) {
    // Now this will autocomplete too!
    if (!req.user || !req.user.canRead("/admin/not/balrog")) {
      throw new ValidationError("UNAUTHORIZED", "You shall not pass!");
    }
    return Commands.canContinueOn(exampleData);
  }
}
```