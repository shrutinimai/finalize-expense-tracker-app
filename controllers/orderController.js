// orderController.js
require('dotenv').config();

const { Cashfree, CFEnvironment } = require("cashfree-pg");
const Order = require("../models/orderModel"); 
const User = require("../models/userModel");   
const cashfree = new Cashfree(
    CFEnvironment.SANDBOX,
    process.env.CASHFREE_CLIENT_ID,
    process.env.CASHFREE_CLIENT_SECRET
);

exports.createOrder = async (req, res) => {
    try {
        const { orderId, orderAmount, orderCurrency = 'INR' } = req.body;
        const userId = req.userId; 

        const user = await User.findById(userId); 
        
        if (!user) {
            return res.status(404).json({ message: 'User not found for payment initiation.' });
        }

        const newOrder = await Order.create({
            orderId: orderId,
            email: user.email, 
            status: 'pending'
        });

        const expiryDate = new Date(Date.now() + 60 * 60 * 1000); 
        const formattedExpiryDate = expiryDate.toISOString();

        const request = {
            "order_amount": orderAmount,
            "order_currency": orderCurrency,
            "order_id": orderId,
            "customer_details": {
                "customer_id": String(user.id),     
                "customer_email": user.email,
                "customer_phone": "7477050952"      
            },
            "order_meta": {
                "return_url": `http://localhost:5500/dashboard.html?orderId={order_id}&payment_status={payment_status}`,
                "payment_methods": "ccc,upi,nb" 
            },
            "order_expiry_time": formattedExpiryDate,
        };

        const response = await cashfree.PGCreateOrder(request);
        console.log("Response from Cashfree PGCreateOrder:", response);

        if (response && response.data && response.data.payment_session_id) {
            return res.status(200).json({ paymentSession_id: response.data.payment_session_id, success: true });
        } else {
            console.error("Cashfree PGCreateOrder did not return expected payment_session_id or structure:", response);
            return res.status(500).json({ message: 'Failed to initiate payment with Cashfree. Missing payment_session_id.' });
        }

    } catch (error) {
        console.error("Error creating order:", error);
        return res.status(500).json({ message: error.message || 'Error initiating payment' });
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ where: { orderId: orderId } });

        if (!order) {
            return res.status(404).json({ message: 'Order not found in your database.' });
        }

        const response = await cashfree.PGOrderFetchPayments(orderId);

        let getOrderResponse = response.data; // This is expected to be an array of transactions
        let orderStatus;
        let isPaymentSuccessful = false;

        if (getOrderResponse.filter(transaction => transaction.payment_status === 'SUCCESS').length > 0) {
            orderStatus = 'success';
            isPaymentSuccessful = true;
        } else if (getOrderResponse.filter(transaction => transaction.payment_status === 'PENDING').length > 0) {
            orderStatus = 'pending';
        } else {
            orderStatus = 'failed';
        }

        if (isPaymentSuccessful) {
            const userToUpdate = await User.findByEmail(order.email); 
            if (userToUpdate) {
                await userToUpdate.update({ isPremiumUser: true });
                console.log(`User ${userToUpdate.id} (email: ${userToUpdate.email}) premium status updated to true.`);
            } else {
                console.warn(`User with email ${order.email} not found for updating premium status, despite successful payment.`);
            }
        }

        await Order.update(
            { status: orderStatus },
            { where: { orderId: orderId } } 
        );

        return res.status(200).json({ status: orderStatus, success: true });

    } catch (error) {
        console.error("Error getting payment status:", error);
        return res.status(500).json({ message: 'Error getting payment status: ' + error.message });
    }
};
