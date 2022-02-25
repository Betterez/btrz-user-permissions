/**
 * @typedef {import("btrz-simple-dao/src/simple-dao").SimpleDao} SimpleDao
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
  const {Permission} = require("./models/index.js");
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

  /**
   * Fetchs all the permissions for a given role for the account
   * @param {*} accountId
   * @param {*} roleId
   * @returns {Permission}
   */
  async function getRolePermissionsForUser(accountId, roleId) {
    const rolePermissions = await simpleDao.for(Permission).findOne({
      roleId,
      accountId
    });
    if (!rolePermissions && roleId !== TEST_ROLE) {
      throw new Error(
        `userPermissionMiddleware: Failed to fetch permissions, account "${accountId}" doesn't have any for the role ${roleId}`
      );
    }
    return rolePermissions || {};
  }

  /**
   * Adds permissions methods to the request user object
   * @param {Request} reqUser Express user object
   * @param {Permission} permissions Permission object
   */
  function enhanceUserWithPermissions(reqUser, permissions) {
    // eslint-disable-next-line no-param-reassign
    reqUser.permissions = permissions;
    // eslint-disable-next-line no-param-reassign
    reqUser.canCreate = function canCreate(path) {
      const permission = this.permissions[path];
      if (permission && permission.create) {
        return permission.create;
      }
      return false;
    };
    // eslint-disable-next-line no-param-reassign
    reqUser.canRead = function canRead(path) {
      const permission = this.permissions[path];
      if (permission && permission.read) {
        return permission.read;
      }
      return false;
    };
    // eslint-disable-next-line no-param-reassign
    reqUser.canUpdate = function canUpdate(path) {
      const permission = this.permissions[path];
      if (permission && permission.update) {
        return permission.update;
      }
      return false;
    };
    // eslint-disable-next-line no-param-reassign
    reqUser.canDelete = function canDelete(path) {
      const permission = this.permissions[path];
      if (permission && permission.delete) {
        return permission.delete;
      }
      return false;
    };

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
        if (!userRole) {
          throw new Error(
            `userPermissionMiddleware: Failed to get the role. User with ID "${req.user._id}" doesn't have a role set.`
          );
        }
        const permissionsForAccountRole = await getRolePermissionsForUser(accountId, userRole);
        req.user = enhanceUserWithPermissions(req.user, permissionsForAccountRole);
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
