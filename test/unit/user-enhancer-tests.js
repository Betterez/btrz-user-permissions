describe("enhanceRequestUser()", () => {
  const {expect} = require("chai");
  const sinon = require("sinon");

  const {SimpleDao, mockSimpleDao} = require("btrz-simple-dao");
  const {UserPermissions} = require("../../index.js");

  const userId = SimpleDao.objectId().toString();
  const mockJwtUser = {_id: userId, id: userId, name: "Test", last: "User"};
  const mockLogger = {
    error(...args) {
      console.error("MockLogger", ...args);
    }
  };

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
          id: "non-existent"
        }
      };
      const expectedError = "userPermissionMiddleware: Failed to fetch user. Check if the user with ID \"non-existent\" exists";
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockNext.callCount).to.equal(1);
      expect(mockNext.args[0]).lengthOf(1);
      expect(mockNext.args[0][0].message).to.equal(expectedError);
    });
  });

  describe("in test enviroment", () => {
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
          id: "test-test"
        }
      };
    });

    it("should call next without an error if the user a testUser specified in config", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockNext.callCount).to.equal(1);
      expect(mockNext.args[0]).lengthOf(0);
    });

    it("should enhance the req.user permissions with an empty object if none in db for the testUser", async () => {
      await middleware(mockRequest, mockResponse, mockNext);
      expect(mockRequest.user).to.be.an("object");
      expect(mockRequest.user.permissions).to.deep.equal({});
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
          findById: null,
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
        mockRequest = {
          account: {
            accountId: "123123123"
          },
          user: {
            id: "test-test"
          }
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

      it("should return false for canCreate for permission /admin/test/role", async () => {
        await middleware(mockRequest, mockResponse, mockNext);
        expect(mockRequest.user.canCreate("/admin/test/role")).to.equal(false);
      });

      it("should return true for canRead for permission /admin/test/role", async () => {
        await middleware(mockRequest, mockResponse, mockNext);
        expect(mockRequest.user.canRead("/admin/test/role")).to.equal(true);
      });
    });
  });
});
