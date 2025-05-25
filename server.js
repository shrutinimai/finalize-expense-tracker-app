const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet'); 
const morgan =require('morgan')
const fs = require('fs');


require('dotenv').config();

const sequelize = require('./config/db'); 
const User = require('./models/userModel');
const Expense = require('./models/expenseModel');
const Order = require('./models/orderModel');
const ForgotPasswordRequests = require('./models/forgotPasswordRequests');
const FileUrl = require('./models/fileUrlModel');
const Note = require('./models/noteModel');

const authRoutes = require('./routes/authroutes');
const userRoutes = require('./routes/userRoutes'); 
const leaderboardRoutes = require('./routes/leaderboardroutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use(morgan('combined', { stream: accessLogStream }));

app.use(cors()); 

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https://sdk.cashfree.com", "https://sandbox.cashfree.com"], 
            scriptSrc: ["'self'", "https://sdk.cashfree.com", "https://cdn.jsdelivr.net"], 
            styleSrc: ["'self'", "'unsafe-inline'"], 
            imgSrc: ["'self'", "data:"], 
            connectSrc: ["'self'", "http://localhost:5500", "https://sandbox.cashfree.com"], 
            frameSrc: ["'self'", "https://sdk.cashfree.com", "https://sandbox.cashfree.com"], 
            formAction: ["'self'", "https://sandbox.cashfree.com"], 
            
    },
}}));

app.use(bodyParser.json()); 

app.use(express.static(path.join(__dirname, 'public')));


User.hasMany(Expense, { foreignKey: 'user_id' });
Expense.belongsTo(User, { foreignKey: 'user_id' });


User.hasMany(Order, { foreignKey: 'email', sourceKey: 'email' }); 
Order.belongsTo(User, { foreignKey: 'email', targetKey: 'email' }); 
User.hasMany(ForgotPasswordRequests, { foreignKey: 'userId' });
ForgotPasswordRequests.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(FileUrl, { foreignKey: 'user_id' });
FileUrl.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Note, { foreignKey: 'userId' });
Note.belongsTo(User, { foreignKey: 'userId' });

app.use('/api', authRoutes);
app.use('/api', userRoutes); 
app.use('/api', leaderboardRoutes);
app.use('/api', orderRoutes); 

app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'html', 'index.html');
    console.log(`Serving index.html from: ${filePath}`);
    res.sendFile(filePath);
});

app.get('/dashboard.html', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'html', 'dashboard.html');
    console.log(`Serving dashboard.html from: ${filePath}`);
    res.sendFile(filePath);
});

app.get('/insights.html', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'html', 'insights.html');
    console.log(`Serving insights.html from: ${filePath}`);
    res.sendFile(filePath);
});

app.get('/password/resetpassword/:id', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'html', 'resetpassword.html');
    console.log(`Serving resetpassword.html from: ${filePath}`);
    res.sendFile(filePath);
});

sequelize.sync()
    .then(() => {
        console.log('database synced successfully.');
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch(err => {
        console.error('Error syncing database:', err);
    });