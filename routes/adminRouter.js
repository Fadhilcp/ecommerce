const express = require('express')
const router = express.Router()
const adminController = require('../controller/admin/adminController')
const customerController = require('../controller/admin/customerController')
const categoryController = require('../controller/admin/categoryController')
const productController = require('../controller/admin/productController')
const orderController = require('../controller/admin/orderController')
const couponController = require('../controller/admin/couponController')
const { adminAuth, isBlock } = require('../middleware/auth')
const multer = require('multer')
const storage = require('../helpers/multer')
const uploads = multer({ storage: storage })

router.get('/pageError', adminController.pageError)

router.get('/login', adminController.loadLogin)
router.post('/login', adminController.login)
//dashboard
router.get('/', adminAuth, adminController.loadDashboard)
router.get('/logout', adminController.logout)

//user management
router.get('/users', adminAuth, customerController.customerInfo)
router.get('/blockCustomer', adminAuth, customerController.customerBlocked)
router.get('/unblockCustomer', adminAuth, customerController.customerunBlocked)


//category management
router.get('/category', adminAuth, categoryController.categoryInfo)
router.post('/addCategory', adminAuth, categoryController.addCategory)
router.post('/addCategoryOffer', adminAuth, categoryController.addCategoryOffer)
router.post('/removeCategoryOffer', adminAuth, categoryController.removeCategoryOffer)
router.get('/listCategory', adminAuth, categoryController.getListCategory)
router.get('/unlistCategory', adminAuth, categoryController.getUnlistCategory)
router.get('/editCategory', adminAuth, categoryController.getEditCategory)
router.post('/editCategory/:id', adminAuth, categoryController.editCategory)


//product management
router.get('/addProducts', adminAuth, productController.getAddProducts)
router.post('/addProducts', adminAuth, uploads.array('images', 3), productController.addProducts)
router.get('/products', adminAuth, productController.getAllProducts)
router.post('/addProductOffer', adminAuth, productController.addProductOffer)
router.post('/removeProductOffer', adminAuth, productController.removeProductOffer)
router.get('/blockProduct', adminAuth, productController.blockProduct)
router.get('/unBlockProduct', adminAuth, productController.unBlockProduct)
router.get('/editProduct', adminAuth, productController.getEditProduct)
router.post('/editProduct/:id', adminAuth, uploads.array('images', 3), productController.editProduct)
router.post('/deleteImage', adminAuth, productController.deleteSingleImage)


//order management
router.get('/orders',adminAuth,orderController.getOrder)
router.get('/orderDetail/:id',adminAuth,orderController.getOrderDetail)
router.post('/updateOrderStatus/:id',adminAuth,orderController.updateOrderStatus)
router.patch('/returnStatus/:id',adminAuth,orderController.returnStatus)

//coupon management
router.get('/coupon',adminAuth,couponController.getCoupon)
router.post('/createCoupon',adminAuth,couponController.createCoupon)
router.delete('/deleteCoupon/:id',adminAuth,couponController.deleteCoupon)

//sales report
router.get('/salesReport',adminAuth,adminController.getSalesReport)

module.exports = router 