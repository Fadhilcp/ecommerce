const Product = require('../../model/productSchema')
const User = require('../../model/userSchema')
const Cart = require('../../model/cartSchema')
const Address = require('../../model/addressSchema')
const Order = require('../../model/orderSchema')
const Wallet = require('../../model/walletSchema')
const Coupon = require('../../model/couponSchema')


function customOrderId(){
    const timestamp = Date.now().toString().slice(-6)
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `ORD-${timestamp}-${randomNum}`
}



const placeOrder = async (req,res) => {
    try {
        
        const userId = req.session.user

        const {addressId,paymentMethod} = req.body

        const user = await User.findById(userId)
        const addressData = await Address.findOne({userId:userId})

        if(!addressData){
            return res.json({status:false,message:'Please add Address'})
        }
        
        const selectedAddress = addressData.address.find(item => item._id.toString() === addressId)

        const cart = await Cart.findOne({userId:userId}).populate('products.productId')

        for (const item of cart.products) {
            const product = await Product.findById(item.productId._id)
            
            if (product.quantity < item.quantity) {
                return res.json({status: false,message: `Insufficient stock for product ${item.productId.productName}`})
            }
        }

        const cartItems = cart.products.map(item => ({
            product: item.productId._id,
            productName: item.productId.productName,
            capacity: item.productId.capacity,
            productImage: item.productId.productImage[0],
            quantity: item.quantity,
            price: item.productId.offerPrice * item.quantity
        }))

        const totalPrice = cart.totalPrice

        const finalPrice = req.session.finalPrice ? req.session.finalPrice : totalPrice
        const couponCode = req.session.couponCode

        if(couponCode){
            await Coupon.findOneAndUpdate({code:couponCode},{ $inc: { totalUsageLimit: -1 }})

            req.session.couponCode = null
        }

        const order = new Order({
            userId:userId,
            orderId:customOrderId(),
            products:cartItems,
            totalPrice:totalPrice,
            finalPrice:finalPrice,
            address:{
                name:user.username,
                houseNo:selectedAddress.houseNo,
                street:selectedAddress.street,
                city:selectedAddress.city,
                state:selectedAddress.state,
                phone:selectedAddress.phone,
                pincode:selectedAddress.pincode
            },
            coupon:couponCode,
            paymentMethod:paymentMethod
        })

        req.session.finalPrice = null

        await order.save()

        for (const item of cartItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } })
        }
        await Cart.findOneAndUpdate({ userId: userId }, { products: [] })

        delete req.session.checkout
        req.session.orderId = order._id

        res.json({status:true,redirectUrl:'/orderComplete'})

    } catch (error) {
        console.log('place order error',error)
        res.json({status:true,message:'Internal server issue'})
    }
}


const getOrderComplete = async (req,res) => {
    try {

        const userId = req.session.user
        const orderId = req.session.orderId

        const orderComplete = await Order.findById(orderId)

        if(!orderComplete){
            return res.redirect('/')
        }

        delete req.session.orderId

        res.render('user/orderComplete',{
            user:userId,
            active:'cart'
        })
        
    } catch (error) {
        console.error('order complete page Error',error)
        res.redirect('/pageError')
    }
}


const cancelOrder = async (req,res) => {
    try {

        const userId = req.session.user
        const orderId = req.params.id 
        const {reason} = req.body

        const order = await Order.findById(orderId)

        if(!order){
            return res.json({status:false,message:'Order not found'})
        }

        if(order.status === 'Cancelled' || order.status === 'Delivered'){
            return res.json({status:false,message:`Order already ${order.status}`})
        }

        order.status = 'Cancelled'
        order.orderCancelReason = reason

        await order.save()

        let wallet = await Wallet.findOne({userId:userId})

        if(!wallet){
            wallet = new Wallet({userId,transaction:[]})
        }

        wallet.balance += order.totalPrice

        wallet.transaction.push({
            transactionType: 'payment',
            amount: order.totalPrice 
        })

        await wallet.save()

        for(const item of order.products){
            await Product.findByIdAndUpdate(item.product ,{
                $inc:{ quantity: item.quantity}
            })
        }

        return res.json({status:true,redirectUrl:'/orders'})

        
    } catch (error) {
        console.error('error while cancel order',error)
        res.json({status:false,message:'error while cancel order'})
    }
}

const cancelItem = async (req,res) => {
    try {

        const orderId = req.params.id 
        const {productId,reason} = req.body

        const order = await Order.findById(orderId)

            const productIndex = order.products.findIndex(item => item.product.toString() === productId)

            if (productIndex === -1) {
                return res.json({ status: false, message: 'Product not found in order' })
            }
            
            if (order.products[productIndex].cancelStatus === 'Cancelled') {
                return res.json({ status: false, message: 'Product already cancelled' })
            }

            order.products[productIndex].cancelStatus = 'Cancelled'
            order.products[productIndex].itemCancelReason = reason

            await Product.findByIdAndUpdate(productId, {
                $inc: { quantity: order.products[productIndex].quantity }
            })

            await order.save()
            return res.json({ status:true, message:'Product cancelled successfully'})
        
    } catch (error) {
        console.error('Error while cancel individual Product',error)
        res.redirect('/pageError')
    }
}


const returnOrder = async (req,res) => {
    try {

        const orderId = req.params.id 
        const {reason} = req.body

        const order = await Order.findById(orderId)

        if(!order){
            return res.json({status:false,message:'Order not found'})
        }
        order.status = 'Requested'
        order.refundStatus = 'Requested'
        order.refundReason = reason

        await order.save()

        return res.json({status:true,redirectUrl:'/orders'})

        
    } catch (error) {
        console.error('error while return order',error)
        res.json({status:false,message:'error while cancel order'})
    }
}

module.exports = {
    placeOrder,
    getOrderComplete,
    cancelOrder,
    returnOrder,
    cancelItem
}