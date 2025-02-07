const User = require('../../model/userSchema')
const Order = require('../../model/orderSchema')
const moment = require('moment')





const getOrder = async (req,res) => {
    try {

        const orders = await Order.find()

        console.log('this is ',orders)

        orders.forEach((order) => {
            order.date = moment(order.createdAt).format('DD/MM/YYYY')
        })

        res.render('admin/orders',{
            orders:orders
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

        console.log('this is data',orderData)

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

        const updateOrder = await Order.findByIdAndUpdate(orderId, {status:updateStatus})

        if(!updateOrder){
            return res.json({status:false,message:'Order not found'})
        }

        res.json({status:true,message:'Order status updated successfully'})
        
    } catch (error) {
        console.error('error while updating order status',error)
        res.redirect('/admin/pageErrro')
    }
}

module.exports = {
    getOrder,
    getOrderDetail,
    updateOrderStatus
}