const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 
const User = require('./userModel'); // Import the User model

const Order = sequelize.define('Order', {
    id: {
        type:DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true,
        allowNull:false
    },
    orderId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true 
    },
    email:{
        type:DataTypes.STRING,
        allowNull:false,
        references: {
            model: User, 
            key: 'email'  
        }

    },

    status:{
        type:DataTypes.STRING,
        allowNull:false,
        defaultValue:'pending'
    },
     
    })



Order.belongsTo(User, { foreignKey: 'email', targetKey: 'email', onDelete: 'CASCADE' });


module.exports = Order;
