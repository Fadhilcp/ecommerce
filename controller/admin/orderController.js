const User = require('../../model/userSchema')
const Order = require('../../model/orderSchema')
const Product = require('../../model/productSchema')
const moment = require('moment')
const Wallet = require('../../model/walletSchema')





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
        console.error('order list page error',error)
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
        console.error('order Detail page Error',error)
        res.redirect('/admin/pageError')
    }
}


const updateOrderStatus = async (req,res) => {
    try {

        const {updateStatus} = req.body

        const orderId = req.params.id

        const existingOrder = await Order.findById(orderId)

        if(!existingOrder){
            return res.json({status:false,message:'Order not found'})
        }

        if(existingOrder.status === 'Cancelled'){
            return res.json({status:false,message:'Order is already Cancelled'})
        }

        const updateOrder = await Order.findByIdAndUpdate(orderId, {status:updateStatus},{new:true})

        if(updateOrder.status === 'Cancelled'){

            const wallet = await Wallet.findOne({userId:updateOrder.userId})

            wallet.balance += order.finalPrice

            wallet.transaction.push({
                transactionType:'payment',
                amount: updateOrder.finalPrice
            })

            for(const item of updateOrder.products){
                   await Product.findByIdAndUpdate(item.product,{
                    $inc:{quantity:item.quantity}
                })
            }

            await wallet.save()
        }

        res.json({status:true,message:'Order status updated successfully'})
        
    } catch (error) {
        console.error('error while updating order status',error)
        res.redirect('/admin/pageErrro')
    }
}


const returnStatus = async (req,res) => {
    try {

        const {result} = req.body

        const orderId = req.params.id

        const order = await Order.findById(orderId)

        if(!order){
            return res.json({status:false,message:'Order not found'})
        }

        order.status = result
        order.refundStatus = result === 'Approved' ? 'Approved' : 'Rejected'

        let wallet = await Wallet.findOne({userId:order.userId})

        if(!wallet){
            wallet = new Wallet({userId:order.userId,transaction:[]})
        }

        if(order.refundStatus === 'Approved'){
            wallet.balance += order.finalPrice

            wallet.transaction.push({
                transactionType:'refund',
                amount: order.finalPrice
            })
        }
        await wallet.save()

        await order.save()

        res.json({status:true})
        
    } catch (error) {
        console.error('return status Error',error)
        res.redirect('/admin/redirect')
    }
}

module.exports = {
    getOrder,
    getOrderDetail,
    updateOrderStatus,
    returnStatus
}