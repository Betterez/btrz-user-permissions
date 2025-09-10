const {SimpleDao} = require("btrz-simple-dao");


class User {
  static collectionName() {
    return "users";
  }

  static factory(literal) {
    const user = new User();
    user._id = literal._id;
    user.role = Object.keys(literal.roles)[0] || "";
    user.temporaryPermissions = literal.temporaryPermissions || [];
    return user;
  }
}

class UserFixture {
  static getUserMock(chance, overrides = {}) {
    const model = {
      _id: SimpleDao.objectId()
    };
    Object.assign(model, overrides);
    return model;
  }

  static create(createFixture, fixturesFactory, userMock1) {
    return createFixture(User.collectionName(), [], SimpleDao)(fixturesFactory, userMock1);
  }
}

module.exports = {
  User,
  UserFixture
};
