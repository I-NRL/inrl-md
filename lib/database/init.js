const {
  DataTypes
} = require("sequelize");
const config = require("../../config");
const database = config.DATABASE.define("database", {
  status: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  session: {
    type: DataTypes.STRING,
    allowNull: false
  },
  started: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  }
});
module.exports = database;