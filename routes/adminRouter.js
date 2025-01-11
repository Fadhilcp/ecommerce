const express = require('express')
const router = express.Router()
const adminController = require('../controller/admin/adminController')
const customerController = require('../controller/admin/customerController')
const categoryController = require('../controller/admin/categoryController')
const productController = require('../controller/admin/productController')
const {userAuth,adminAuth} = require('../middleware/auth')
const multer = require('multer')
const storage = require('../helpers/multer')
const uploads = multer({storage:storage})

router.get('/pageError',adminController.pageError)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

//user management
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)


//category management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory) 
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)


//product management
router.get('/products',adminAuth,productController.getAddProducts)
router.post('/addProducts',adminAuth,uploads.array('images',3),productController.addProducts) 

module.exports = router