const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false

    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isPremiumUser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    total_expenses: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'userlogin',
    timestamps: false
});

User.findByEmail = async function(email) {
    return await User.findOne({ where: { email } });
};


User.findById = async function(id) {
    return await User.findOne({ where: { id } });
};

module.exports = User;