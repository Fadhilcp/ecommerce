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

        orderData.date = moment(orderData.createdAt).format('MMMM Do YYYY, h:mm:ss A')

        res.render('admin/orderDetail',{
            order:orderData,
            user:user
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
                amount: updateOrder.finalPrice
            })

            for(const item of updateOrder.products){
                   await Product.findByIdAndUpdate(item.product,{
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

        order.status = result
        order.refundStatus = result

        let wallet = await Wallet.findOne({ userId: order.userId });

        if(!wallet){
            wallet = new Wallet({userId:order.userId,transaction:[]});
        }

        if(order.refundStatus === ORDER_STATUS.DELIVERED || result === 'Approved'){

            wallet.balance = Number((wallet.balance + order.finalPrice).toFixed(2))

            wallet.transaction.push({
                transactionType:'refund',
                amount: order.finalPrice
            })
        }
        await wallet.save()

        await order.save()

        res.json({status:true})
        
    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const itemReturnStatus = async (req,res) => {
    try {

        const {result,productId} = req.body

        const orderId = req.params.id

        const order = await Order.findById(orderId)
        if(!order){
            return res.json({ status: false, message: MESSAGES.ORDER_NOT_FOUND })
        }

        const productIndex = order.products.findIndex(item => item.product.toString() === productId)

        if (productIndex === -1) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND_IN_ORDER })
        }

        if (order.products[productIndex].cancelStatus === result) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_ALREADY_MUTATED });
        }

        order.products[productIndex].cancelStatus = result
        order.products[productIndex].refundStatus = result


        let wallet = await Wallet.findOne({userId:order.userId})

        if(!wallet){
            wallet = new Wallet({ userId:order.userId, transaction:[] })
        }

        let refundAmount = order.products[productIndex].price

        //calculating return status
        if(order.coupon){
            const discountPercentage = (refundAmount - order.finalPrice) / refundAmount
            refundAmount -= refundAmount * discountPercentage
        }

        if(order.refundStatus === 'Approved'){
            refundAmount = order.product[productIndex].price

            wallet.balance += Number((wallet.balance + refundAmount).toFixed(2))

            wallet.transaction.push({
                transactionType:'refund',
                amount: refundAmount
            })
        }

        await wallet.save()
        await order.save()

        res.json({status:true}) 
        
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