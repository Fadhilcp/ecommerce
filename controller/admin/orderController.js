const User = require('../../model/userSchema');
const Order = require('../../model/orderSchema');
const Product = require('../../model/productSchema');
const moment = require('moment');
const Wallet = require('../../model/walletSchema');
const MESSAGES = require('../../constants/messages');
const ORDER_STATUS = require('../../constants/orderStatus');

const getOrder = async (req,res) => {
    try {

        const page = parseInt(req.query.page) || 1
        const limit = 10
        const skip = (page - 1)*limit

        const orders = await Order.find()
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        orders.forEach((order) => {
            order.date = moment(order.createdAt).format('DD/MM/YYYY')
        })

        const totalOrders = await Order.countDocuments()
        const totalPages = Math.ceil(totalOrders / limit)

        res.render('admin/orders',{
            orders:orders,
            currentPage:page,
            totalPages:totalPages
        })
        
    } catch (error) {
        res.redirect('/admin/pageError')
    }
}


const getOrderDetail = async (req,res) => {
    try {
        const orderId = req.params.id
        const orderData = await Order.findById(orderId)
        const user = await User.findOne({_id:orderData.userId})

        orderData.date = moment(orderData.createdAt).format('MMMM Do YYYY, h:mm:ss A');

        let discountPercentage = 0;
        if (orderData.coupon && orderData.coupon.discountValue) {
            discountPercentage = orderData.coupon.discountValue;
        }

        res.render('admin/orderDetail' ,{
            order:orderData,
            user:user,
            discountPercentage: discountPercentage,
        })
        
    } catch (error) {
        res.redirect('/admin/pageError')
    }
}


const updateOrderStatus = async (req,res) => {
    try {

        const {updateStatus} = req.body

        const orderId = req.params.id

        const existingOrder = await Order.findById(orderId)

        if(!existingOrder){
            return res.json({ status: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        if(existingOrder.status === ORDER_STATUS.CANCELLED){
            return res.json({ status: false, message: MESSAGES.ORDER_ALREADY_CANCELLED });
        }

        const updateOrder = await Order.findByIdAndUpdate(orderId, {status:updateStatus},{new:true})

        if(updateOrder.status === ORDER_STATUS.CANCELLED){

            updateOrder.products.forEach(product => {
                product.cancelStatus = ORDER_STATUS.CANCELLED;
            })

            const wallet = await Wallet.findOne({userId:updateOrder.userId})

            wallet.balance = Number((wallet.balance + updateOrder.finalPrice).toFixed(2))

            wallet.transaction.push({
                transactionType:'credit',
                amount: updateOrder.finalPrice,
                date: new Date()
            });

            for(const item of updateOrder.products){
                   await Product.findByIdAndUpdate(item.product, {
                    $inc:{quantity:item.quantity}
                })
            }
            await wallet.save()
        }

        await updateOrder.save()
        res.json({ status: true, message: MESSAGES.ORDER_STATUS_UPDATED })
        
    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR })
    }
}

const returnStatus = async (req,res) => {
    try {

        const {result} = req.body
        const orderId = req.params.id

        const order = await Order.findById(orderId)
        if(!order){
            return res.json({ status: false, message: MESSAGES.ORDER_NOT_FOUND });
        }

        order.refundStatus = result
        
        if (result === 'Approved') {
            order.status = 'Returned';
            
            order.products.forEach(p => {
                if (p.cancelStatus === 'Requested') {
                    p.cancelStatus = 'Approved';
                    p.refundStatus = 'Approved';
                }
            });

            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = new Wallet({ userId: order.userId, transaction: [] });
            }

            wallet.balance = Number((wallet.balance + order.finalPrice).toFixed(2));
            wallet.transaction.push({
                transactionType: 'refund',
                amount: order.finalPrice,
                date: new Date()
            });
            await wallet.save();

            // Re stock products
            for (const item of order.products) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { quantity: item.quantity }
                });
            }
        } else {
            order.status = 'Delivered';
        }

        await order.save();
        res.json({ status: true });
        
    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const itemReturnStatus = async (req,res) => {
    try {

        const {result,productId} = req.body;
        const orderId = req.params.id

        const order = await Order.findById(orderId);
        if(!order){
            return res.json({ status: false, message: MESSAGES.ORDER_NOT_FOUND })
        }

        const productIndex = order.products.findIndex(item => item.product.toString() === productId);
        if (productIndex === -1) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND_IN_ORDER })
        }

        order.products[productIndex].cancelStatus = result;
        order.products[productIndex].refundStatus = result;

        let unitPrice = order.products[productIndex].price;
        let quantity = order.products[productIndex].quantity;
        let itemTotalRowPrice = unitPrice * quantity; 
        
        let refundAmount = itemTotalRowPrice;

        if (order.coupon && order.coupon.discountValue) {
            const couponDiscount = (itemTotalRowPrice * order.coupon.discountValue) / 100;
            refundAmount = itemTotalRowPrice - couponDiscount;
        }
        refundAmount = Number(refundAmount.toFixed(2));

        if (result === 'Approved') {
            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = new Wallet({ userId: order.userId, transaction: [] });
            }

            wallet.balance = Number((wallet.balance + refundAmount).toFixed(2));
            wallet.transaction.push({
                transactionType: 'refund',
                amount: refundAmount,
                date: new Date()
            });
            await wallet.save();

            await Product.findByIdAndUpdate(productId, {
                $inc: { quantity: quantity }
            });

            order.finalPrice = Number((order.finalPrice - refundAmount).toFixed(2));
            if (order.finalPrice < 0) order.finalPrice = 0;

            order.totalPrice = Number((order.totalPrice - itemTotalRowPrice).toFixed(2));
            if (order.totalPrice < 0) order.totalPrice = 0;

            const allItemsReturned = order.products.every(p => p.cancelStatus === 'Approved' || p.cancelStatus === 'Cancelled');
            if (allItemsReturned) {
                order.status = 'Returned';
                order.refundStatus = 'Approved';
                
                if (order.shippingFee > 0) {
                    wallet.balance = Number((wallet.balance + order.shippingFee).toFixed(2));
                    wallet.transaction.push({
                        transactionType: 'refund',
                        amount: order.shippingFee,
                        date: new Date()
                    });
                    await wallet.save();
                }
                order.finalPrice = 0;
            }
        } else if (result === 'Rejected') {
            const activeRequests = order.products.some(p => p.cancelStatus === 'Requested');
            if (!activeRequests && order.status === 'Requested') {
                order.status = 'Delivered';
            }
        }

        await order.save();
        res.json({ status: true });
        
    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR })
    }
}

module.exports = {
    getOrder,
    getOrderDetail,
    updateOrderStatus,
    returnStatus,
    itemReturnStatus
}