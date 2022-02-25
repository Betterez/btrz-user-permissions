const {SimpleDao} = require("btrz-simple-dao");

class Permission {
  static collectionName() {
    return "permissions";
  }

  static factory(literal) {
    const permission = new Permission();
    Object.assign(permission, literal);
    return permission;
  }
}

class PermissionFixture {
  static getPermissionMock(chance, overrides = {}) {
    const model = {
      _id: SimpleDao.objectId()
    };
    Object.assign(model, overrides);
    return model;
  }

  static create(createFixture, fixturesFactory, permissionMock1) {
    return createFixture(Permission.collectionName(), [], SimpleDao)(fixturesFactory, permissionMock1);
  }
}

module.exports = {
  Permission,
  PermissionFixture
};
