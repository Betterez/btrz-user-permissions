describe("enhanceRequestUser()", () => {
  const {expect} = require("chai");
  const sinon = require("sinon");

  const {SimpleDao, mockSimpleDao} = require("btrz-simple-dao");
  const {UserPermissions} = require("../../index.js");

  const userId = SimpleDao.objectId().toString();
  const mockJwtUser = {_id: userId, id: userId, name: "Test", last: "User", role: "test-role"};

  let simpleDao = null;

  /** @type {import("express").Request} */
  let mockRequest = {};
  /** @type {import("express").Response} */
  let mockResponse = {
    json: sinon.spy()
  };
  let mockNext = sinon.spy();

  let userPermission = null;
  let middleware = null;

  const config = {
    "testUser": {
      _id: "test-test"
    }
  };

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: sinon.spy()
    };
    mockNext = sinon.spy();
  });

  afterEach(() => {
    simpleDao = null;
    sinon.restore();
  });

  describe("without user", () => {
    let mockLogger = null;

    beforeEach(() => {
      simpleDao = mockSimpleDao();
      /**
       * Manually overriding mockSimpleDao due to a conditional
       * bug if use falsy values
       */
      simpleDao.findById = () => {
        return Promise.resolve(null);
      };
      simpleDao.findOne = () => {
        return Promise.resolve(null);
      };
      mockLogger = {
        error: sinon.stub()
      };
      mockRequest = {
        account: {
          accountId: "123123123"
        },
        user: {
          _id: "test-test"
        }
      };
      userPermission = new UserPermissions({simpleDao, logger: mockLogger}, config);
      middleware = userPermission.enhanceRequestUser();
    });

    it("should return the middleware function when called", () => {
      expect(userPermission.enhanceRequestUser).to.be.instanceOf(Function);
      expect(middleware).to.be.instanceOf(Function);
    });

    it("should call next if no user is set in req without errors", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockNext.callCount).to.equal(1);
      expect(mockNext.args[0]).lengthOf(0);
    });

    it("should call next with an error if the user does not exist", async () => {
      mockRequest = {
        account: {
          accountId: "123"
        },
        user: {
          _id: "non-existent"
        }
      };
      await middleware(mockRequest, mockResponse, mockNext);
    });

    it("should log an error if trying to call a method without a permissions table", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      mockRequest.user.canRead("/test");
      expect(mockNext.callCount).to.equal(1);
      expect(mockNext.args[0]).lengthOf(0);
      expect(mockLogger.error.callCount).to.equal(1);
      expect(mockLogger.error.args[0][0]).to.equal(
        "userPermissionMiddleware: calling methods without permissions, please check your current account permissions table"
      );
    });
  });

  describe("with user", () => {
    const permissions = {
      "/admin/test/role": {
        create: false,
        read: true,
        update: true,
        delete: false
      },
      "/admin/other/role": {
        create: false,
        read: true,
        update: false,
        delete: true
      }
    };
    const mockPermissions = {
      "accountId": "accountId123123",
      "roleId": "administrator",
      ...permissions
    };
    const mockLogger = {
      error: sinon.stub()
    };

    beforeEach(() => {
      mockRequest = {
        account: {
          accountId: "123123123"
        },
        user: {
          _id: "test-test",
          role: "administrator"
        }
      };
      simpleDao = mockSimpleDao({
        findById: {
          ...mockJwtUser,
          roles: {
            administrator: 1
          }
        },
        findOne: mockPermissions
      });
      userPermission = new UserPermissions({simpleDao, logger: mockLogger}, config);
      middleware = userPermission.enhanceRequestUser();
    });

    it("should call next without an error and enhance req.user", async () => {   
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockNext.callCount).to.equal(1);
      expect(mockNext.args[0]).lengthOf(0);
      expect(mockRequest.user).to.be.an("object");
      expect(mockRequest.user.permissions).to.deep.equal(mockPermissions);
      expect(mockRequest.user.canCreate).to.be.instanceOf(Function);
      expect(mockRequest.user.canRead).to.be.instanceOf(Function);
      expect(mockRequest.user.canUpdate).to.be.instanceOf(Function);
      expect(mockRequest.user.canDelete).to.be.instanceOf(Function);
    });

    it("should return false when calling canCreate for path /admin/test/role", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockRequest.user.canCreate("/admin/test/role")).to.equal(false);
    });

    it("should return true when calling canRead for path /admin/test/role", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockRequest.user.canRead("/admin/test/role")).to.equal(true);
    });

    it("should return false when calling canUpdate for path /admin/other/role", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockRequest.user.canUpdate("/admin/other/role")).to.equal(false);
    });

    it("should return true when calling canDelete for path /admin/other/role", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockRequest.user.canDelete("/admin/other/role")).to.equal(true);
    });

    it("should return false when calling canRead and log the error for an unknown path", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockRequest.user.canRead("/admin/unknown/action")).to.equal(false);
      expect(mockLogger.error.callCount).to.equal(1);
      expect(mockLogger.error.args[0][0]).to.equal(
        "userPermissionMiddleware: invalid or missing permission path /admin/unknown/action for the current user's permissions"
      );
    });

    it("should return false when calling canRead with an argument that is not a string", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockRequest.user.canRead({"hey": ["I broke stuff"]})).to.equal(false);
    });
  });

  describe("in test enviroment", () => {
    let mockLogger = null;
    beforeEach(() => {
      simpleDao = mockSimpleDao();
      /**
       * Manually overriding mockSimpleDao due to a conditional
       * bug if use falsy values
       */
      simpleDao.findById = () => {
        return Promise.resolve(null);
      };
      simpleDao.findOne = () => {
        return Promise.resolve(null);
      };
      mockRequest = {
        account: {
          accountId: "123123123"
        },
        user: {
          _id: "test-test",
          role: "test-role"
        }
      };
      mockLogger = {
        error: sinon.stub()
      };
      userPermission = new UserPermissions({simpleDao, logger: mockLogger}, config);
      middleware = userPermission.enhanceRequestUser();
    });

    it("should call next without an error if the user a testUser specified in config", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockNext.callCount).to.equal(1);
      expect(mockNext.args[0]).lengthOf(0);
    });

    it("should enhance the req.user permissions with null if none in db for the testUser", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockRequest.user).to.be.an("object");
      expect(mockRequest.user.permissions).to.deep.equal(null);
      expect(mockRequest.user.canCreate).to.be.instanceOf(Function);
      expect(mockRequest.user.canRead).to.be.instanceOf(Function);
      expect(mockRequest.user.canUpdate).to.be.instanceOf(Function);
      expect(mockRequest.user.canDelete).to.be.instanceOf(Function);
      expect(mockNext.callCount).to.equal(1);
      expect(mockNext.args[0]).lengthOf(0);
    });

    describe("with mock permissions data", () => {
      beforeEach(() => {
        simpleDao = mockSimpleDao({
          findOne: {
            "accountId": "123123123",
            "roleId": "test-role",
            "/admin/test/role": {
              create: false,
              read: true,
              update: true,
              delete: false
            }
          }
        });
        simpleDao.findById = null;
        mockRequest = {
          account: {
            accountId: "123123123"
          },
          user: {
            _id: "test-test",
            role: "test-role"
          }
        };
        const mockLogger = {
          error: sinon.stub()
        };
        userPermission = new UserPermissions({simpleDao, logger: mockLogger}, config);
        middleware = userPermission.enhanceRequestUser();
      });

      it("should enhance the req.user permissions with mock data if present in db for the testUser", async () => {
        await middleware(mockRequest, mockResponse, mockNext);
        expect(mockRequest.user).to.be.an("object");
        expect(mockRequest.user.permissions).to.haveOwnProperty("/admin/test/role");
        expect(mockNext.callCount).to.equal(1);
        expect(mockNext.args[0]).lengthOf(0);
      });

      it("should return false when canCreate is called for path /admin/test/role", async () => {
        await middleware(mockRequest, mockResponse, mockNext);
        expect(mockRequest.user.canCreate("/admin/test/role")).to.equal(false);
      });

      it("should return true when canRead is called for path /admin/test/role", async () => {
        await middleware(mockRequest, mockResponse, mockNext);
        expect(mockRequest.user.canRead("/admin/test/role")).to.equal(true);
      });
    });
  });
});
