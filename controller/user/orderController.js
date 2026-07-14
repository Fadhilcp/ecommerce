const Product = require('../../model/productSchema')
const User = require('../../model/userSchema')
const Cart = require('../../model/cartSchema')
const Address = require('../../model/addressSchema')
const Order = require('../../model/orderSchema')
const Wallet = require('../../model/walletSchema')
const Coupon = require('../../model/couponSchema')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const env = require('dotenv').config()
const PDFDocument = require('pdfkit')
const MESSAGES = require('../../constants/messages');
const ORDER_STATUS = require('../../constants/orderStatus');
const { status } = require('init')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

function customOrderId(){
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestamp}-${randomNum}`;
}

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId, paymentMethod } = req.body;

        const user = await User.findById(userId);
        const addressData = await Address.findOne({ userId: userId });

        if (!addressData) {
            return res.json({ status: false, message: MESSAGES.ADDRESS_REQUIRED });
        }

        const selectedAddress = addressData.address.find(item => item._id.toString() === addressId);

        const cart = await Cart.findOne({ userId: userId }).populate('products.productId');

        // Checking stock
        for (const item of cart.products) {
            const product = await Product.findById(item.productId._id);

            if (product.quantity < item.quantity) {
                return res.json({ status: false, message: `${MESSAGES.INSUFFICIENT_STOCK} ${item.productId.productName}` });
            }
        }

        const cartItems = cart.products.map(item => ({
            product: item.productId._id,
            productName: item.productId.productName,
            capacity: item.productId.capacity,
            productImage: item.productId.productImage[0],
            quantity: item.quantity,
            price: item.productId.offerPrice 
        }));

        const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        let finalPrice = req.session.finalPrice && req.session.finalPrice <= totalPrice ? req.session.finalPrice : totalPrice;
        const couponCode = req.session.couponCode;

        const shippingFee = 40;

        let couponSnapshot = { code: null, discountValue: 0 };

        // Checking coupon
        if (couponCode) {
            const check = await Coupon.findOne({ code: couponCode, isDeleted: false });

            if (!check) {
                return res.json({ status: false, message: MESSAGES.INVALID_COUPON_CODE });
            }

            if (check.minValue > totalPrice) {
                return res.json({
                    status: false,
                    message: `${MESSAGES.COUPON_MIN_ORDER_VALUE_REQUIRED} (${check.minValue})`
                });
            }

            if (check.totalUsageLimit <= 0) {
                return res.json({
                    status: false,
                    message: MESSAGES.COUPON_USAGE_LIMIT_REACHED
                });
            }

            let discountAmount = Number(((totalPrice * check.discountValue) / 100).toFixed(2));
            finalPrice = Number((totalPrice - discountAmount).toFixed(2));

            couponSnapshot.code = check.code;
            couponSnapshot.discountValue = check.discountValue;
            
            await Coupon.findOneAndUpdate(
                { code: couponCode, isDeleted: false },
                { $inc: { totalUsageLimit: -1 } }
            );
            req.session.couponCode = null;
        }

        finalPrice += shippingFee;

        // razorpay
        if (paymentMethod === 'RazorPay') {
            const options = {
                amount: finalPrice * 100,
                currency: "INR",
                receipt: `order_${Date.now()}`
            };

            const razorpayOrder = await razorpay.orders.create(options);
            let paymentStatus = 'Failed';

            // temporary order
            const order = new Order({ 
                userId,
                orderId: customOrderId(),
                products: cartItems,
                totalPrice,
                finalPrice,
                address: {
                    name: user.username,
                    houseNo: selectedAddress.houseNo,
                    street: selectedAddress.street,
                    city: selectedAddress.city,
                    state: selectedAddress.state,
                    phone: selectedAddress.phone,
                    pincode: selectedAddress.pincode
                },
                coupon: couponSnapshot,
                paymentMethod,
                paymentStatus,
                status: ORDER_STATUS.PENDING,
            });

            await order.save();

            await Cart.findOneAndUpdate({ userId: userId }, { products: [] });

            delete req.session.checkout;
            req.session.orderId = order._id;
            return res.json({ status: true, razorpayOrder });
        }

        // cash on delivery / Wallet
        if (paymentMethod === 'COD' || paymentMethod === 'Wallet') {

            if (paymentMethod === 'COD' && finalPrice >= 1000) {
                return res.json({ status: false, message: 'Orders above 1000 are not allowed with Cash on Delivery.' });
            }

            let paymentStatus = 'Pending';

            if (paymentMethod === 'Wallet') {
                let wallet = await Wallet.findOne({ userId });

                if (!wallet) {
                    wallet = new Wallet({ userId: user._id, balance: 0, transaction: [] });
                    await wallet.save();
                }
                if (wallet.balance < finalPrice) {
                    return res.json({ status: false, message: MESSAGES.INSUFFICIENT_WALLET_BALANCE });
                }

                wallet.transaction.push({
                    transactionType: 'debit',
                    amount: finalPrice,
                    date: new Date()
                });

                wallet.balance = Number((wallet.balance - finalPrice).toFixed(2));
                await wallet.save();

                paymentStatus = 'Paid';
            }

            const order = new Order({
                userId,
                orderId: customOrderId(),
                products: cartItems,
                totalPrice,
                finalPrice,
                address: {
                    name: user.username,
                    houseNo: selectedAddress.houseNo,
                    street: selectedAddress.street,
                    city: selectedAddress.city,
                    state: selectedAddress.state,
                    phone: selectedAddress.phone,
                    pincode: selectedAddress.pincode
                },
                coupon: couponSnapshot,
                paymentStatus,
                paymentMethod,
                status: ORDER_STATUS.PENDING
            });

            req.session.finalPrice = null;
            await order.save();

            for (const item of cartItems) {
                await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
            }

            await Cart.findOneAndUpdate({ userId: userId }, { products: [] });

            delete req.session.checkout;
            req.session.orderId = order._id;

            return res.json({ status: true });
        }

    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const getOrderComplete = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.session.orderId;

        const orderComplete = await Order.findById(orderId);

        if (!orderComplete) {
            return res.redirect('/');
        }

        delete req.session.orderId;

        res.render('user/orderComplete', {
            user: userId,
            active: 'cart'
        });
        
    } catch (error) {
        res.redirect('/pageError');
    }
}

const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.id;
        const { reason } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.json({ status: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.DELIVERED) {
            return res.json({ status: false, message: `Order is already ${order.status.toLowerCase()}.` });
        }

        let refundAmount = order.finalPrice;

        if (order.status !== ORDER_STATUS.PENDING && order.shippingFee) {
            refundAmount = order.finalPrice - order.shippingFee;
        }

        order.status = ORDER_STATUS.CANCELLED;
        order.orderCancelReason = reason;

        order.products.forEach(product => {
            product.cancelStatus = ORDER_STATUS.CANCELLED;
            product.itemCancelReason = 'Order cancelled';
        });

        await order.save();

        if (order.paymentStatus === 'Paid') {
            let wallet = await Wallet.findOne({ userId: order.userId });

            if (!wallet) {
                wallet = new Wallet({ userId: order.userId, balance: 0, transaction: [] });
            }
            wallet.balance = Number((wallet.balance + refundAmount).toFixed(2));

            wallet.transaction.push({
                transactionType: 'credit',
                amount: refundAmount
            });

            await wallet.save();
        }

        if (order.paymentStatus !== 'Failed') {
            for (const item of order.products) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { quantity: item.quantity }
                });
            }
        }

        return res.json({ status: true, redirectUrl: '/orders' });

    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const cancelItem = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { productId, reason } = req.body;

        const order = await Order.findById(orderId);
        const productIndex = order.products.findIndex(item => item.product.toString() === productId);

        if (productIndex === -1) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND_IN_ORDER });
        }
        
        if (order.products[productIndex].cancelStatus === ORDER_STATUS.CANCELLED) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_ALREADY_CANCELLED });
        }

        order.products[productIndex].cancelStatus = ORDER_STATUS.CANCELLED;
        order.products[productIndex].itemCancelReason = reason;

        // calculating refund amount
        let itemPrice = order.products[productIndex].price;
        let refundAmount = itemPrice;

        // if there is a coupon applied
        if (order.coupon && order.coupon.discountValue) {
            const couponDiscount = (itemPrice * order.coupon.discountValue) / 100;
            refundAmount = itemPrice - couponDiscount;
        }

        refundAmount = Number(refundAmount.toFixed(2));

        const userId = order.userId;
        let wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
            wallet = new Wallet({ userId, transaction: [] });
        }

        if (order.paymentStatus === 'Paid') {
            wallet.balance = Number((wallet.balance + refundAmount).toFixed(2));

            wallet.transaction.push({
                transactionType: 'credit', 
                amount: refundAmount,
                date: new Date()
            });

            await wallet.save();
        }

        if (order.paymentStatus !== 'Failed') {
            await Product.findByIdAndUpdate(productId, {
                $inc: { quantity: order.products[productIndex].quantity }
            });
        }

        order.finalPrice = Number((order.finalPrice - refundAmount).toFixed(2));
        if (order.finalPrice < 0) order.finalPrice = 0;

        order.totalPrice = Number((order.totalPrice - itemPrice).toFixed(2));
        if (order.totalPrice < 0) order.totalPrice = 0;

        // check if all items are cancelled 
        const allCancelled = order.products.every(product => product.cancelStatus === ORDER_STATUS.CANCELLED);

        if (allCancelled) {
            order.status = ORDER_STATUS.CANCELLED;
            order.orderCancelReason = 'All products were cancelled by the user';

            if (order.paymentStatus === 'Paid' && order.shippingFee > 0) {
                
                wallet.balance = Number((wallet.balance + order.shippingFee).toFixed(2));
                wallet.transaction.push({
                    transactionType: 'credit', 
                    amount: order.shippingFee,
                    date: new Date()
                });
                await wallet.save();
            }

            order.finalPrice = 0;
            await order.save();
            return res.json({ status: true, message: MESSAGES.ALL_PRODUCTS_CANCELLED });
        }

        await order.save();
        return res.json({ status: true, message: MESSAGES.PRODUCT_CANCELLED_SUCCESS });
    
    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { reason } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.json({ status: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        if (order.status === 'Cancelled' || order.status === 'Returned' || order.status === 'Requested') {
            return res.json({ status: false, message: `Order is already ${order.status.toLowerCase()}.` });
        }

        order.status = 'Requested';
        order.refundStatus = 'Requested';
        order.refundReason = reason;

        order.products.forEach(product => {
            if (product.cancelStatus !== 'Cancelled' && product.cancelStatus !== 'Approved' && product.cancelStatus !== 'Rejected') {
                product.cancelStatus = 'Requested';
                product.refundStatus = 'Requested';
                product.refundReason = reason;
            }
        });

        await order.save();
        return res.json({ status: true, redirectUrl: '/orders' });

    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const returnItem = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { productId, reason } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.json({ status: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        const productIndex = order.products.findIndex(item => item.product.toString() === productId);

        if (productIndex === -1) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND_IN_ORDER });
        }

        const product = order.products[productIndex];

        if (product.cancelStatus === 'Requested' || product.cancelStatus === 'Approved') {
            return res.json({ status: false, message: MESSAGES.PRODUCT_ALREADY_REQUESTED_RETURN });
        }

        // 1. Update the specific item's status
        product.cancelStatus = 'Requested';
        product.refundStatus = 'Requested';
        product.refundReason = reason;

        // 2. UPDATE: Dynamic Bottom-Up Check
        // Check if every single item in this order is now either Cancelled, Requested, Approved, or Rejected
        const allItemsProcessed = order.products.every(p => 
            ['Requested', 'Approved', 'Rejected', 'Cancelled', 'Returned'].includes(p.cancelStatus)
        );

        // If all items are accounted for in a return/cancel flow, elevate the global order status automatically!
        if (allItemsProcessed && order.status === 'Delivered') {
            order.status = 'Requested';
            order.refundStatus = 'Requested';
            order.refundReason = 'All items individually requested for return by user.';
        }

        await order.save();
        return res.json({ status: true, message: MESSAGES.ORDER_RETURN_REQUEST_SUBMITTED });
    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const createOrder = async (req, res) => {
    try {
        const { orderId, finalPrice } = req.body;

        const options = {
            amount: finalPrice * 100,
            currency: "INR",
            receipt: `order_rcptid_${orderId}`
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, razorpayOrder: order, key: process.env.RAZORPAY_KEY });
    } catch (error) {
        res.status(500).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        if (orderId) {
            req.session.orderId = orderId;
        }

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ status: false, message: MESSAGES.INVALID_PAYMENT_DETAILS });
        }

        const key_secret = process.env.RAZORPAY_SECRET;

        const expectedSignature = crypto
            .createHmac('sha256', key_secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            const orderID = req.session.orderId;
            const order = await Order.findById(orderID);
            
            order.paymentStatus = 'Paid';
            await order.save();

            for (const item of order.products) {
                await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
            }

            return res.json({ status: true, message: MESSAGES.PAYMENT_VERIFIED });
        } else {
            return res.status(400).json({ status: false, message: MESSAGES.PAYMENT_VERIFICATION_FAILED });
        }

    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}
const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId).populate('userId');

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Set response headers
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.orderId || orderId}.pdf`);
        res.setHeader("Content-Type", "application/pdf");

        // Create PDF 
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        // --- 1. HEADER ---
        doc.font("Helvetica-Bold").fontSize(24).fillColor("#333").text("PERFUMORA", { align: "center", letterSpacing: 2 });
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(10).fillColor("#666").text("Invoice / Receipt", { align: "center" });
        doc.moveDown(2);

        // --- 2. ORDER & SHIPPING INFO (Two Columns with strictly managed Y-coordinates) ---
        const customerX = 50;
        const shippingX = 320;
        const infoStartY = doc.y; // Lock the starting Y position

        // Left Column: Order Info
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#333").text("Order Details", customerX, infoStartY);
        doc.font("Helvetica").fontSize(10).fillColor("#555");
        doc.text(`Invoice No: ${order.orderId}`, customerX, infoStartY + 15);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, customerX, infoStartY + 30);
        doc.text(`Payment Method: ${order.paymentMethod}`, customerX, infoStartY + 45);
        doc.text(`Payment Status: ${order.paymentStatus}`, customerX, infoStartY + 60);

        // Right Column: Shipping Address
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#333").text("Shipping Address", shippingX, infoStartY);
        doc.font("Helvetica").fontSize(10).fillColor("#555");
        doc.text(order.address.name, shippingX, infoStartY + 15);
        doc.text(`${order.address.houseNo}, ${order.address.street}`, shippingX, infoStartY + 30);
        doc.text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`, shippingX, infoStartY + 45);
        doc.text(`Phone: ${order.address.phone}`, shippingX, infoStartY + 60);

        // Safely push the document cursor below the longest column
        doc.y = infoStartY + 90; 

        // --- 3. ITEMS TABLE HEADER ---
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#ddd").stroke();
        doc.moveDown(0.5);
        
        const tableTop = doc.y;
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#333");
        doc.text("No.", 50, tableTop);
        doc.text("Product Details", 90, tableTop);
        doc.text("Qty", 320, tableTop);
        doc.text("Unit Price", 380, tableTop);
        doc.text("Total", 480, tableTop, { width: 70, align: "right" });
        
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#ddd").stroke();
        doc.moveDown(0.5);

        // --- 4. ITEMS TABLE ROWS ---
        doc.font("Helvetica").fontSize(10).fillColor("#555");
        let yPos = doc.y;

        order.products.forEach((item, index) => {
            if (yPos > 650) {
                doc.addPage();
                yPos = 50;
            }

            const rowTotal = item.price * item.quantity;

            doc.text(index + 1, 50, yPos);
            doc.text(`${item.productName} (${item.capacity})`, 90, yPos, { width: 220 });
            doc.text(item.quantity.toString(), 320, yPos);
            doc.text(`$${item.price.toFixed(2)}`, 380, yPos);
            doc.text(`$${rowTotal.toFixed(2)}`, 480, yPos, { width: 70, align: "right" });
            
            yPos = doc.y + 10; 
        });

        doc.y = yPos;
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#ddd").stroke();
        doc.moveDown(1.5);

        // --- 5. COST SUMMARY (Strictly managed Y-coordinates) ---
        const summaryX = 350;
        const summaryValueX = 480;
        let summaryY = doc.y; // Lock Y position for the summary section

        doc.font("Helvetica").fontSize(10);
        
        // Subtotal
        doc.text("Subtotal:", summaryX, summaryY);
        doc.text(`$${order.totalPrice.toFixed(2)}`, summaryValueX, summaryY, { width: 70, align: "right" });
        summaryY += 15;

        // Shipping Fee
        doc.text("Shipping Fee:", summaryX, summaryY);
        doc.text(`$${order.shippingFee.toFixed(2)}`, summaryValueX, summaryY, { width: 70, align: "right" });
        summaryY += 15;

        // Discount (Only show if a coupon was used)
        if (order.coupon && order.coupon.discountValue > 0) {
            doc.fillColor("#228B22").text(`Discount (${order.coupon.code}):`, summaryX, summaryY);
            doc.text(`-$${order.coupon.discountValue.toFixed(2)}`, summaryValueX, summaryY, { width: 70, align: "right" });
            summaryY += 15;
        }

        // Grand Total Box
        summaryY += 5; // Add a little gap before the total box
        doc.rect(summaryX - 10, summaryY, 230, 25).fillColor("#f5f5f5").fill();
        doc.fillColor("#333").font("Helvetica-Bold").fontSize(12);
        
        // Draw text inside the box (using summaryY offset)
        doc.text("Grand Total:", summaryX, summaryY + 7);
        doc.text(`$${order.finalPrice.toFixed(2)}`, summaryValueX, summaryY + 7, { width: 70, align: "right" });

        // Safely push cursor below the total box
        doc.y = summaryY + 40;

        // --- 6. FOOTER ---
        doc.moveDown(2);
        doc.font("Helvetica-Oblique")
            .fontSize(10)
            .fillColor("#888")
            .text("Thank you for shopping with PERFUMORA!", { align: "center" });

        doc.end();

    } catch (error) {
        console.error("PDF Generation Error: ", error);
        res.status(500).json({ status: false, message: "Internal Server Error" }); 
    }
}

module.exports = {
    placeOrder,
    getOrderComplete,
    cancelOrder,
    returnOrder,
    cancelItem,
    returnItem,
    createOrder,
    verifyPayment,
    downloadInvoice
}