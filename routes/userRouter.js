const express = require('express')
const router = express.Router()

const userController = require('../controller/user/userController')
const passport = require('passport')


router.get('/',userController.loadHomePage)
router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/register',userController.loadRegister)
router.post('/register',userController.register)
router.post('/verifyOtp',userController.verifyOtp)
router.post('/resendOtp',userController.resendOtp)

router.get('/account',userController.account)
router.get('/logout',userController.logout)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req,res)=>{
    res.redirect('/')
})

module.exports = router