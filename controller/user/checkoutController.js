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
            return res.redirect('/pageError')
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


const placeOrder = async (req,res) => {
    try {
        
        const userId = req.session.user

        const {addressId} = req.body



        console.log('this is id',addressId)

        res.json({status:true,redirectUrl:'/orderComplete'})

    } catch (error) {
        console.log('place order error',error)
        res.json({status:true,message:'Internal server issue'})
    }
}





module.exports = {
    getCheckout,
    placeOrder
}