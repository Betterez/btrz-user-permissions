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
  const {User, Permission} = require("./models/index.js");
  const {VALID_PERMISSIONS, TEST_ROLE} = require("./constants.js");

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
   * @param {*} userId Current user id
   * @returns {string} Role ID
   */
  async function getUserRole(userId) {
    if (isTestUser(userId)) {
      return TEST_ROLE;
    }

    const user = await simpleDao.for(User).findById(userId);

    if (!user) {
      throw new Error(`userPermissionMiddleware: Failed to fetch user. Check if the user with ID "${userId}" exists`);
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
    return rolePermissions || [];
  }

  /**
   * Check if all permissions are in the keyed path
   * @param {*} permission Permission object
   * @returns {boolean}
   */
  function isValidPermission(permission) {
    return Object.keys(permission).every((path) => {
      return VALID_PERMISSIONS.indexOf(path) >= 0;
    });
  }

  /**
   * Adds permissions methods to the request user object
   * @param {Request} reqUser Express user object
   * @param {Permission} permissions Permission object
   */
  function enhanceUserWithPermissions(reqUser, permissions) {
    const permissionsList = Object.keys(permissions).reduce((list, path) => {
      if (isValidPermission(permissions[path])) {
        // eslint-disable-next-line no-param-reassign
        list[path] = permissions[path];
      }
      return list;
    }, {});

    function canCreate(path) {
      const permission = this.permissions[path];
      if (permission && permission.create) {
        return permission.create;
      }
      return false;
    }
    function canRead(path) {
      const permission = this.permissions[path];
      if (permission && permission.read) {
        return permission.read;
      }
      return false;
    }
    function canUpdate(path) {
      const permission = this.permissions[path];
      if (permission && permission.update) {
        return permission.update;
      }
      return false;
    }
    function canDelete(path) {
      const permission = this.permissions[path];
      if (permission && permission.delete) {
        return permission.delete;
      }
      return false;
    }

    const permissionEnhance = {
      permissions: permissionsList,
      canCreate,
      canRead,
      canUpdate,
      canDelete
    };

    return Object.assign(reqUser, permissionEnhance);
  }

  /**
   * User Permissions main middleware
   * @param {import("express").Request} req Request object
   * @param {import("express").Response} res Response object
   * @param {import("express").NextFunction} next Next function
   */
  async function userPermissionMiddleware(req, res, next) {
    if (req.account && req.user && req.user.id) {
      try {
        const accountId = req.account.accountId;
        const userRole = await getUserRole(req.user.id);
        if (!userRole) {
          throw new Error(`userPermissionMiddleware: Failed to get the user role. User with ID "${req.user.id}" does not have a role`);
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
