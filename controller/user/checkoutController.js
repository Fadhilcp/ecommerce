const Product = require('../../model/productSchema')
const User = require('../../model/userSchema')
const Cart = require('../../model/cartSchema')
const Address = require('../../model/addressSchema')
const Coupon = require('../../model/couponSchema')
const moment = require('moment')




const checkStock = async (req,res) => {
    try {

        const userId = req.session.user

        const cart = await Cart.findOne({userId:userId}).populate('products.productId')

        for (const item of cart.products) {
            const product = await Product.findById(item.productId._id)
            
            if (product.quantity < item.quantity) {
                return res.json({
                    status: false,
                    message: `Insufficient stock for product ${item.productId.productName}`,
                    text:`Only ${product.quantity} Stock available`})
            }
        }

        req.session.checkout = true
        return res.json({status:true})
        
    } catch (error) {
        console.error('stock checking in cart',error)
    }
}


const getCheckout = async (req,res) => {

    try {

        const userId = req.session.user

        if(!userId){
            return res.redirect('/login')
        }

        const coupons = await Coupon.find()

        coupons.forEach((item) => {
                item.expire = moment(item.endDate).format('DD-MM-YYYY')
                item.valid = moment(item.startDate).format('DD-MM-YYYY')
        })
        
                coupons.reverse()

        const cart = await Cart.findOne({userId:userId}).populate('products.productId')

        if(!cart){
            return res.redirect('/shop')
        }else if(cart.products.length === 0 || !req.session.checkout){
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

        const orderTotal = cart.products.reduce((sum, item) => {
            return sum + (item.productId.offerPrice * item.quantity);
        }, 0)

        const shippingFee = 40

        let finalPrice = orderTotal + shippingFee

        let discountAmount = 0

        delete req.session.couponCode   
        delete req.session.finalPrice 

        return res.render('user/checkout',{
            userAddress:addressData,
            cartItems:cartItems,
            orderTotal:orderTotal,
            finalTotal:finalPrice,
            discountAmount,
            coupons:coupons,
            user:userId,
            active:'cart',
            shippingFee: shippingFee
        })
        
    } catch (error) {
        console.error('Checkout page error',error)
        res.redirect('/pageError')
    }
}




const applyCoupon = async (req,res) => {
    try {

        const {couponCode} = req.body

        const userId = req.session.user

        const currentDate = new Date()

        const coupon = await Coupon.findOne({code:couponCode,
            isActive:true,
            totalUsageLimit:{$gt:0},
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        })

        const cart = await Cart.findOne({userId:userId})

        if(!coupon){
            return res.json({status:true,message:'Invalid or Expired Coupon',finalTotal:cart.totalPrice})
        }
        
        if(cart.totalPrice < coupon.minValue){
            return res.json({status:false,
                message:`The coupon is valid for orders greaterthan ${coupon.minValue}`
            })
        }

        const shippingFee = 40

        const discountAmount = Number(((cart.totalPrice * coupon.discountValue) / 100).toFixed(2))
        let finalPrice = Number((cart.totalPrice - discountAmount).toFixed(2))

        finalPrice += shippingFee

        req.session.finalPrice = finalPrice
        req.session.couponCode = couponCode

        return res.json({status:true,message:'Coupon applied',finalTotal:finalPrice,discountAmount:discountAmount})
        
    } catch (error) {
        console.error('Coupon applying error',error)
        res.json({status:false,message:'Internal Server Error'})
    }
}



const removeCoupon = async (req,res) => {
    try {

        const userId = req.session.user

        if(!req.session.couponCode){
            return res.json({status:false,message:'No coupon applied'})
        }

        req.session.couponCode = null
        req.session.finalPrice = null

        const cart = await Cart.findOne({userId:userId})

        const shippingFee = 40
        const finalPrice = cart.totalPrice + shippingFee

        res.json({status:true,message:'Coupon removed',finalTotal:finalPrice})
        
    } catch (error) {
        console.error('remove coupon Error')
        res.json({status:false,message:'Server internal Error'})
    }
}





module.exports = {
    getCheckout,
    checkStock,
    applyCoupon,
    removeCoupon
}