const express = require('express')
const router = express.Router()

const userController = require('../controller/user/userController')
const productController = require('../controller/user/productController')
const profileController = require('../controller/user/profileController')
const passport = require('passport')
const {userAuth,isBlock,productIsBlock} = require('../middleware/auth')

router.get('/',userController.loadHomePage)
router.get('/login',isBlock,userController.loadLogin)
router.post('/login',isBlock,userController.login)
router.get('/register',isBlock,userController.loadRegister)
router.post('/register',isBlock,userController.register)
router.post('/verifyOtp',isBlock,userController.verifyOtp)
router.post('/resendOtp',isBlock,userController.resendOtp)

router.get('/logout',userAuth,userController.logout)
router.get('/shop',isBlock,userController.getShop)
router.post('/addReviews',isBlock,productController.addReviews)

router.get('/productDetails',productIsBlock,isBlock,productController.productDetails)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req,res)=>{
    res.redirect('/')
})

router.get('/account',userAuth,profileController.account)
router.get('/changePassword',userAuth,profileController.getChangePassword)
router.post('/changePassword',userAuth,profileController.changePassword)

module.exports = router