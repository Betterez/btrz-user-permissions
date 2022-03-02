import { Request } from "express";

export interface UserRequest extends Request {
  /**
   * The current account set by x-api-token
   */
  account: {
    accountId: string;
    userId?: string;
  };
  /**
   * The current JWT authenticated user
   */
  user?: {
    _id: string;
    id: string;
    email: string;
    role: string;
    /**
     * Raw results of `permissions.findOne()` with the `accountId` and `roleId` of the logged user
     */
    permissions: {
      [key: string]: {
        read?: boolean;
        create?: boolean;
        update?: boolean;
        delete?: boolean;
      };
    };
    /**
     * Check if the user can perform a read action to the given path
     * @param path Permission path as string "/admin/can/read"
     * @returns {boolean} Returns `true` if the user has the specified permission, returns `false` by default
     */
    canRead(path: string): boolean;
    /**
     * Check if the user perform a create action to the given path
     * @param path Permission path as string "/admin/can/create"
     * @returns {boolean} Returns `true` if the user has the specified permission, returns `false` by default
     */
    canCreate(path: string): boolean;
    /**
     * Check if the user perform an update action to the given path
     * @param path Permission path as string "/admin/can/update"
     * @returns {boolean} Returns `true` if the user has the specified permission, returns `false` by default
     */
    canUpdate(path: string): boolean;
    /**
     * Check if the user can perform a delete action to the given path
     * @param path Permission path as string "/admin/can/delete"
     * @returns {boolean} Returns `true` if the user has the specified permission, returns `false` by default
     */
    canDelete(path: string): boolean;
  };
}
