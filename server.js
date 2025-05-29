const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
//const helmet = require('helmet'); 
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

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); 
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use(morgan('combined', { stream: accessLogStream }));

app.use(cors()); 

// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'", "https://sdk.cashfree.com", "https://sandbox.cashfree.com"], 
//             scriptSrc: ["'self'", "https://sdk.cashfree.com", "https://cdn.jsdelivr.net"], 
//             styleSrc: ["'self'", "'unsafe-inline'"], 
//             imgSrc: ["'self'", "data:"], 
//             connectSrc: ["'self'", "http://localhost:5500", "https://sandbox.cashfree.com"], 
//             frameSrc: ["'self'", "https://sdk.cashfree.com", "https://sandbox.cashfree.com"], 
//             formAction: ["'self'", "https://sandbox.cashfree.com"], 
            
//     },
// }}));

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
const filePath = path.join(__dirname, 'views', 'index.html');
     console.log(`Serving index.html from: ${filePath}`);
     res.sendFile(filePath);
 });

 app.get('/dashboard.html', (req, res) => {
     const filePath = path.join(__dirname,  'views', 'dashboard.html');
     console.log(`Serving dashboard.html from: ${filePath}`);
     res.sendFile(filePath);
 });

 app.get('/insights.html', (req, res) => {
    const filePath = path.join(__dirname, 'views', 'insights.html');
     console.log(`Serving insights.html from: ${filePath}`);
     res.sendFile(filePath);
 });

 app.get('/password/resetpassword/:id', (req, res) => {
     const filePath = path.join(__dirname,  'views', 'resetpassword.html');
     console.log(`Serving resetpassword.html from: ${filePath}`);
     res.sendFile(filePath);
 });

// app.get('/', (req, res) => {
//      res.sendFile(path.join(__dirname, 'views', 'index.html'), (err) => {
//          if (err) {
//              console.error(`Error serving index.html:`, err);
//              res.status(500).send('Internal Server Error');
//          }
//      });
//  });

// app.get('*', (req, res) => {
//     const requestedUrl = req.url;

//     if (
//         requestedUrl === '/dashboard.html' ||
//         requestedUrl === '/insights.html'
//     ) {
//         res.sendFile(path.join(__dirname, 'views', requestedUrl), (err) => {
//             if (err) {
//                 console.error(`Error serving HTML file ${requestedUrl}:`, err);
//                 res.status(404).send('HTML Page Not Found');
//             } else {
//                 console.log(`Served HTML page: ${requestedUrl}`);
//             }
//         });
//     }
//     else if (requestedUrl.startsWith('/password/resetpassword/')) {
//         res.sendFile(path.join(__dirname, 'views', 'resetpassword.html'), (err) => {
//             if (err) {
//                 console.error(`Error serving resetpassword.html (dynamic route):`, err);
//                 res.status(404).send('Reset Password Page Not Found');
//             } else {
//                 console.log(`Served resetpassword.html for dynamic route.`);
//             }
//         });
//     }
//     else {
//         const filePath = path.join(__dirname, 'public', requestedUrl);
//         res.sendFile(filePath, (err) => {
//             if (err) {
//                 console.log(`Static file not found or error: ${filePath}`, err.message);
//                 res.status(404).send('Static Asset Not Found');
//             } else {
//                 console.log(`Served static file: ${filePath}`);
//             }
//         });
//     }
// });


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