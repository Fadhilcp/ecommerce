const express = require('express')
const router = express.Router()
const adminController = require('../controller/admin/adminController')
const {userAuth,adminAuth} = require('../middleware/auth')

router.get('/pageError',adminController.pageError)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)


module.exports = router