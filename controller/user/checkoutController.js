const Product = require('../../model/productSchema')
const User = require('../../model/userSchema')
const Cart = require('../../model/cartSchema')
const Address = require('../../model/addressSchema')
const Order = require('../../model/orderSchema')



const getCheckout = async (req,res) => {

    try {

        const userId = req.session.user

        if(!userId){
            return res.redirect('/login')
        }

        const cart = await Cart.findOne({userId:userId}).populate('products.productId')

        if(!cart){
            return res.redirect('/login')
        }else if(cart.products.length === 0){
            return res.redirect('/cart')
        }


        const addressData = await Address.findOne({userId:userId})

        const cartItems = cart.products.map(item => ({
            _id: item.productId._id,
            name: item.productId.productName,
            price: item.productId.offerPrice,
            quantity: item.quantity,
            total: item.productId.offerPrice * item.quantity
        }))

        const orderTotal = cartItems.reduce((sum,item) => sum + item.total,0) 

        return res.render('user/checkout',{
            userAddress:addressData,
            cartItems:cartItems,
            orderTotal:orderTotal,
            user:userId,
            active:'cart'
        })
        
    } catch (error) {
        console.error('Checkout page error',error)
        res.redirect('/pageError')
    }
}







module.exports = {
    getCheckout
}