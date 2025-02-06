const Product = require('../../model/productSchema')
const User = require('../../model/userSchema')
const Cart = require('../../model/cartSchema')
const Address = require('../../model/addressSchema')
const Order = require('../../model/orderSchema')



const placeOrder = async (req,res) => {
    try {
        
        const userId = req.session.user

        const {addressId,paymentMethod} = req.body

        const addressData = await Address.findOne({userId:userId})
        const selectedAddress = addressData.address.find(item => item._id.toString() === addressId)

        const cart = await Cart.findOne({userId:userId}).populate('products.productId')

        const cartItems = cart.products.map(item => ({
            product: item.productId._id,
            productName: item.productId.productName,
            capacity: item.productId.capacity,
            productImage: item.productId.productImage[0],
            quantity: item.quantity,
            price: item.productId.offerPrice * item.quantity
        }))

        const totalPrice = cartItems.reduce((total,item) => total + item.price,0)

        const order = new Order({
            userId:userId,
            products:cartItems,
            totalPrice:totalPrice,
            address:{
                houseNo:selectedAddress.houseNo,
                street:selectedAddress.street,
                city:selectedAddress.city,
                state:selectedAddress.state,
                phone:selectedAddress.phone,
                pincode:selectedAddress.pincode
            },
            paymentMethod:paymentMethod
        })


        await order.save()

        for (const item of cartItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } })
        }
        await Cart.findOneAndUpdate({ userId: userId }, { products: [] })

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

module.exports = {
    placeOrder,
    getOrderComplete
}