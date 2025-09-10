describe("Express integration", () => {
  const request = require("supertest");
  const {expect} = require("chai");
  const express = require("express");
  const {SimpleDao} = require("btrz-simple-dao");
  const {MongoFactory, createFixture} = require("btrz-mongo-factory");
  const {UserPermissions} = require("../../index.js");
  const {User, UserFixture, PermissionFixture} = require("../../models/index.js");
  const userId = SimpleDao.objectId();
  const testUserFromJwt = {_id: userId, id: userId.toString(), name: "Test", last: "User", role: "administrator"};
  const mockAccount = {accountId: "testAccount"};
  const mockLogger = {
    error(...args) {
      console.error("MockLogger ERROR:", ...args);
    },
    info(...args) {
      console.info("MockLogger INFO:", ...args);
    }
  };

  const config = {
    "testUser": {
      "_id": "test123"
    },
    "db": {
      "options": {
        "database": "btrzUserPermissionsTest",
        "username": "",
        "password": ""
      },
      "uris": [
        "127.0.0.1:27017"
      ]
    }
  };

  const simpleDao = new SimpleDao(config, mockLogger);
  const fixtureFactoryOptions = {
    loadFromModels: true,
    fixtures: `${__dirname}/../../models`,
    db: config.db
  };
  const fixturesFactory = new MongoFactory(fixtureFactoryOptions);

  async function updateUser(userId, update) {
    return simpleDao.for(User).update({_id: SimpleDao.objectId(userId)}, {$set: update});
  }

  let app = null;
  let userPermission = null;

  beforeEach(() => {
    userPermission = new UserPermissions({simpleDao, logger: mockLogger}, config);
    app = express();
    app.get("/public-route", (req, res) => {
      return res.json(req.user);
    });
    app.use((req, res, next) => {
      // Mocking btrz-auth-api-key
      req.account = mockAccount;
      req.user = testUserFromJwt;
      return next();
    });
    app.use(userPermission.enhanceRequestUser());

    app.get("/read-test", (req, res) => {
      if (req.user.canRead("/admin/test/path")) {
        return res.sendStatus(200);
      }
      return res.sendStatus(403);
    });
    app.get("/create-test", (req, res) => {
      if (req.user.canCreate("/admin/test/path")) {
        return res.sendStatus(200);
      }
      return res.sendStatus(403);
    });
    app.get("/update-test", (req, res) => {
      if (req.user.canUpdate("/admin/test/path")) {
        return res.sendStatus(200);
      }
      return res.sendStatus(403);
    });
    app.get("/delete-test", (req, res) => {
      if (req.user.canDelete("/admin/test/path")) {
        return res.sendStatus(200);
      }
      return res.sendStatus(403);
    });

    const mockUser = {
      ...testUserFromJwt,
      "accountId": mockAccount.accountId,
      "roles": {
        "administrator": 1
      }
    };
    const mockPermissions = {
      "accountId": mockAccount.accountId,
      "roleId": "administrator",
      "/admin/test/path": {
        "read": true,
        "create": false,
        "update": false,
        "delete": true
      }
    };

    return Promise.all([
      UserFixture.create(createFixture, fixturesFactory, mockUser),
      PermissionFixture.create(createFixture, fixturesFactory, mockPermissions)
    ]);
  });

  afterEach(() => {
    return fixturesFactory.clearAll();
  });

  it("should not yet enhance the req.user object", (done) => {
    request(app)
      .get("/public-route")
      .set("Accept", "application/json")
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.text).to.equal("");
        return done();
      });
  });

  it("should return 200 if user has read permission for the path /admin/test/path", (done) => {
    request(app)
      .get("/read-test")
      .set("Accept", "application/json")
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it("should return 403 if user does not have create permission for the path /admin/test/path", (done) => {
    request(app)
      .get("/create-test")
      .set("Accept", "application/json")
      .expect(403)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it("should return 200 if the user has been granted temporary permissions for the path /admin/test/path", async () => {
    await updateUser(userId, {
      temporaryPermissions: [
        {
          actionName: "some-action",
          permissions: {
            "/admin/test/path": {
              create: true
            }
          },
          expires: "2999-01-01T00:00:00.000Z"
        }
      ]
    });

    await request(app)
      .get("/create-test")
      .set("Accept", "application/json")
      .expect(200);
  });

  it("should return 403 if the user has been granted temporary permissions for the path /admin/test/path, but the permissions have expired", async () => {
    await updateUser(userId, {
      temporaryPermissions: [
        {
          actionName: "some-action",
          permissions: {
            "/admin/test/path": {
              create: true
            }
          },
          expires: "2000-01-01T00:00:00.000Z"
        }
      ]
    });

    await request(app)
      .get("/create-test")
      .set("Accept", "application/json")
      .expect(403);
  });

  it("should return 403 if user does not have update permission for the path /admin/test/path", (done) => {
    request(app)
      .get("/update-test")
      .set("Accept", "application/json")
      .expect(403)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it("should return 200 if user has delete permission for the path /admin/test/path", (done) => {
    request(app)
      .get("/delete-test")
      .set("Accept", "application/json")
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
