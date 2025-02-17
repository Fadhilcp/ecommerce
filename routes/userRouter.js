const express = require('express')
const router = express.Router()

const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')
const profileController = require('../controller/user/profileController')
const cartController = require('../controller/user/cartController')
const checkoutController = require('../controller/user/checkoutController')
const orderController = require('../controller/user/orderController')

const passport = require('passport')
const {userAuth,isBlock,productIsBlock} = require('../middleware/auth')

//home 
router.get('/',userController.loadHomePage)
router.get('/pageError',userController.pageError)

//signup and login managaement
router.get('/login',isBlock,userController.loadLogin)
router.post('/login',isBlock,userController.login)
router.get('/register',isBlock,userController.loadRegister)
router.post('/register',isBlock,userController.register)
router.post('/verifyOtp',isBlock,userController.verifyOtp)
router.post('/resendOtp',isBlock,userController.resendOtp)

//forgot password
router.get('/forgotPassword',isBlock,profileController.getForgotPassword)
router.post('/forgotPassword',isBlock,profileController.forgotPasswordEmail)
router.post('/forgotPasswordOtp',isBlock,profileController.passwordOtp)
router.post('/resendPasswordOtp',isBlock,profileController.resendOtp)
router.get('/resetPassword',isBlock,profileController.getResetPassword)
router.post('/resetPassword',isBlock,profileController.newPassword)

router.get('/logout',userAuth,userController.logout)

router.get('/shop',isBlock,userController.getShop)

//product //management
router.post('/addReviews',isBlock,productController.addReviews)
router.get('/productDetails',productIsBlock,isBlock,productController.productDetails)

//google auth
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),userController.passportToUser)

//profile management
router.get('/account',isBlock,userAuth,profileController.account)
router.get('/changePassword',isBlock,userAuth,profileController.getChangePassword)
router.post('/changePassword',userAuth,profileController.changePassword)

//address management
router.get('/address',isBlock,userAuth,profileController.getAddress)
router.get('/createAddress',isBlock,userAuth,profileController.getCreateAddress)
router.post('/createAddress',userAuth,profileController.createAddress)
router.get('/editAddress',isBlock,userAuth,profileController.getEditAddress)
router.post('/editAddress',userAuth,profileController.editAddress)
router.get('/deleteAddress',userAuth,profileController.deleteAddress)

//orders details list
router.get('/orders',isBlock,userAuth,profileController.getOrders)
router.get('/orderDetails/:id',isBlock,userAuth,profileController.getOrderDetail)


//wallet
router.get('/wallet',isBlock,userAuth,profileController.getWallet)

//cart management
router.get('/cart',isBlock,userAuth,cartController.getCart)
router.post('/addToCart',isBlock,cartController.addToCart)
router.post('/updateCartQuantity',userAuth,cartController.updateCartQuantity)
router.get('/deleteCartItem/:id',userAuth,cartController.deleteCartItem)


//wishlist management 
router.get('/wishlist',isBlock,userAuth,cartController.getWishlist)
router.post('/addToWishlist',isBlock,userAuth,cartController.addToWishlist)
router.get('/deleteWishlistItem/:id',isBlock,userAuth,cartController.deleteWishlistItem)
router.post('/wishlistToCart',isBlock,userAuth,cartController.wishlistToCart)

//checkout management
router.get('/checkStock',isBlock,userAuth,checkoutController.checkStock)
router.get('/checkout',isBlock,userAuth,checkoutController.getCheckout)

//coupon
router.post('/applyCoupon',isBlock,userAuth,checkoutController.applyCoupon)
router.delete('/removeCoupon',isBlock,userAuth,checkoutController.removeCoupon)

//place order
router.post('/placeOrder',isBlock,userAuth,orderController.placeOrder)
router.get('/orderComplete',isBlock,userAuth,orderController.getOrderComplete)
router.patch('/cancelOrder/:id',isBlock,userAuth,orderController.cancelOrder)
router.patch('/returnOrder/:id',isBlock,userAuth,orderController.returnOrder) 
router.patch('/cancelItem/:id',isBlock,userAuth,orderController.cancelItem)
router.patch('/returnItem/:id',isBlock,userAuth,orderController.returnItem)

//razorpay
router.post('/verifyPayment',isBlock,userAuth,orderController.verifyPayment)



module.exports = router 