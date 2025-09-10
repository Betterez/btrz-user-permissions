/**
 * @typedef {import("btrz-logger/src/logger").Logger} Logger
 */

/**
 * Returns an user object permissions enhancer
 * @param {Object} deps
 * @param {SimpleDao} deps.simpleDao SimpleDao instance
 * @param {Logger} deps.logger Logger instance
 * @param {Object} options Auth config options
 */
function UserPermissions({simpleDao, logger}, options) {
  const {SimpleDao} = require("btrz-simple-dao");
  const {Permission} = require("./models/index.js");
  const {User} = require("./models/user.js");
  const {TEST_ROLE} = require("./constants.js");

  if (!simpleDao) {
    throw new Error("You must provide a simpleDao initialized instance");
  }
  if (!logger) {
    throw new Error("You must provide a logger instance");
  }

  /**
   * Check if the current user belongs to the API's user config
   * @param {string} userId
   * @returns {boolean}
   */
  function isTestUser(userId) {
    if (options.testUser && options.testUser._id === userId) {
      return true;
    }
    return false;
  }

  /**
   * Returns the assigned role to the user
   * @param {*} user User object
   * @returns {string} Role ID
   */
  function getUserRole(user) {
    if (isTestUser(user._id)) {
      return TEST_ROLE;
    }

    return user.role;
  }

  function getPermissions(permissions, temporaryPermissions, path) {
    if (!permissions) {
      logger.error("userPermissionMiddleware: calling methods without permissions, please check your current account permissions table");
      return {};
    }
    if (!permissions[path]) {
      logger.error(`userPermissionMiddleware: invalid or missing permission path ${path} for the current user's permissions`);
    }

    const now = new Date();
    const temporaryPermissionsForPath = temporaryPermissions.filter((literal) => {
      return Object.hasOwn(literal.permissions, path);
    }).filter((literal) => {
      return new Date(literal.expires) > now;
    }).map((literal) => {
      return literal.permissions[path];
    }).reduce((acc, permissions) => {
      return {
        ...acc,
        ...permissions
      };
    }, {});

    return {
      ...permissions[path],
      ...temporaryPermissionsForPath
    };
  }

  /**
   * Fetchs all the permissions for a given role for the account
   * @param {*} accountId
   * @param {*} roleId
   * @returns {Permission}
   */
  async function getRolePermissionsForUser(accountId, roleId) {
    if (!roleId) {
      return null;
    }

    const rolePermissions = await simpleDao.for(Permission).findOne({
      roleId,
      accountId
    });

    /**
    * Let's ignore this for now, silently fail if
    * there is no "role", since not all JWT tokens
    * will have it when deployed to production
    *
    * if (!rolePermissions && roleId !== TEST_ROLE) {
    *   throw new Error(
    *     `userPermissionMiddleware: Failed to fetch permissions, account "${accountId}" doesn't have any for the role ${roleId}`
    *   );
    * }
    */
    return rolePermissions;
  }

  /**
   * Fetches all of the temporary permissions for a given user.
   * @param {*} userId
   */
  async function getTemporaryPermissionsForUser(userId) {
    if (!userId) {
      return [];
    }

    const user = await simpleDao.for(User).findOne({_id: SimpleDao.objectId(userId)}, {temporaryPermissions: 1});
    return user?.temporaryPermissions || [];
  }

  /**
   * Adds permissions methods to the request user object
   * @param {Request} reqUser Express user object
   * @param {Permission} permissions Permission object
   */
  function enhanceUserWithPermissions(reqUser, permissions, temporaryPermissions) {
    /* eslint-disable no-param-reassign */
    reqUser.permissions = permissions;
    reqUser.temporaryPermissions = temporaryPermissions;

    reqUser.canCreate = function canCreate(path) {
      const permission = getPermissions(this.permissions, this.temporaryPermissions, path);
      if (permission && permission.create) {
        return permission.create;
      }
      return false;
    };
    reqUser.canRead = function canRead(path) {
      const permission = getPermissions(this.permissions, this.temporaryPermissions, path);
      if (permission && permission.read) {
        return permission.read;
      }
      return false;
    };
    reqUser.canUpdate = function canUpdate(path) {
      const permission = getPermissions(this.permissions, this.temporaryPermissions, path);
      if (permission && permission.update) {
        return permission.update;
      }
      return false;
    };
    reqUser.canDelete = function canDelete(path) {
      const permission = getPermissions(this.permissions, this.temporaryPermissions, path);
      if (permission && permission.delete) {
        return permission.delete;
      }
      return false;
    };
    /* eslint-enable no-param-reassign */

    return reqUser;
  }

  /**
   * User Permissions main middleware
   * @param {import("express").Request} req Request object
   * @param {import("express").Response} res Response object
   * @param {import("express").NextFunction} next Next function
   */
  async function userPermissionMiddleware(req, res, next) {
    if (req.account && req.user) {
      try {
        const accountId = req.account.accountId;
        const userRole = getUserRole(req.user);
        /**
         * if (!userRole) {
         *  throw new Error(
         *    `userPermissionMiddleware: Failed to get the role. User with ID "${req.user._id}" doesn't have a role set.`
         *  );
         *}
         */

        const [
          permissionsForAccountRole,
          temporaryPermissionsForUser
        ] = await Promise.all([
          getRolePermissionsForUser(accountId, userRole),
          getTemporaryPermissionsForUser(req.user._id)
        ]);
        req.user = enhanceUserWithPermissions(req.user, permissionsForAccountRole, temporaryPermissionsForUser);
        return next();
      } catch (e) {
        logger.error(e.message);
        return next(e);
      }
    }
    return next();
  }

  return {
    enhanceRequestUser: () => {
      return userPermissionMiddleware;
    }
  };
}

module.exports = {
  UserPermissions
};
