const User = require('../../model/userSchema')
const Order = require('../../model/orderSchema')
const Product = require('../../model/productSchema')
const moment = require('moment')





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


        const updateOrder = await Order.findByIdAndUpdate(orderId, {status:updateStatus},{new:true})

        if(!updateOrder){
            return res.json({status:false,message:'Order not found'})
        }

        if(updateOrder.status === 'Cancelled'){
            for(const item of updateOrder.products){
                   await Product.findByIdAndUpdate(item.product,{
                    $inc:{quantity:item.quantity}
                })
            }
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