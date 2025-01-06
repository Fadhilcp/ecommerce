const express = require('express')
const router = express.Router()

const userController = require('../controller/user/userController')


router.get('/',userController.loadHomePage)
router.get('/login',userController.loadLogin)
router.get('/register',userController.loadRegister)
router.post('/register',userController.register)
router.post('/verifyOtp',userController.verifyOtp)
router.post('/resendOtp',userController.resendOtp)

module.exports = router