describe.skip("Express integration", () => {
  const request = require("supertest");
  const {expect} = require("chai");
  const express = require("express");
  const {SimpleDao} = require("btrz-simple-dao");
  const {MongoFactory, createFixture} = require("btrz-mongo-factory");
  const userId = SimpleDao.objectId();
  const testUserFromJwt = {_id: userId, id: userId.toString(), name: "Test", last: "User"};
  const logger = {
    error(...args) {
      console.error("MockLogger", ...args);
    }
  };

  const config = {
    "testUser": testUserFromJwt,
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

  const simpleDao = new SimpleDao(config, logger);
  const fixtureFactoryOptions = {
    loadFromModels: true,
    fixtures: `${__dirname}/../models`,
    db: config.db
  };
  const fixturesFactory = new MongoFactory(fixtureFactoryOptions);

  let app = null;

  beforeEach(() => {
    app = express();
    app.use((req, res, next) => {
      // Mocking btrz-auth-api-key
      req.user = testUserFromJwt;
      return next();
    });
    app.get("/pre-enhance", (req, res) => {
      return res.json(req.user);
    });
  });

  it("should not yet enhance the req.user object", (done) => {
    request(app)
      .get("/pre-enhance")
      .set("Accept", "application/json")
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
