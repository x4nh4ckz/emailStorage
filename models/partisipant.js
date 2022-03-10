'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Partisipant extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Partisipant.init({
    address: DataTypes.STRING,
    email: DataTypes.STRING,
    signature: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Partisipant',
  });
  return Partisipant;
};