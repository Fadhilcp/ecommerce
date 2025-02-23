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
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout', adminController.logout)

//user management
router.get('/users', adminAuth, customerController.customerInfo)
router.get('/blockCustomer', adminAuth, customerController.customerBlocked)
router.get('/unblockCustomer', adminAuth, customerController.customerunBlocked)


//category management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',adminAuth, categoryController.addCategory)
//category offer
router.patch('/addCategoryOffer',adminAuth, categoryController.addCategoryOffer)
router.patch('/removeCategoryOffer',adminAuth, categoryController.removeCategoryOffer)

router.patch('/listCategory', adminAuth, categoryController.listCategory)
router.patch('/unlistCategory', adminAuth, categoryController.unlistCategory)

router.get('/editCategory', adminAuth, categoryController.getEditCategory)
router.patch('/editCategory/:id', adminAuth, categoryController.editCategory)


//product management
router.get('/addProducts', adminAuth, productController.getAddProducts)
router.post('/addProducts', adminAuth, uploads.array('images', 3), productController.addProducts)
router.get('/products', adminAuth, productController.getAllProducts)
//product offer
router.patch('/addProductOffer', adminAuth, productController.addProductOffer)
router.patch('/removeProductOffer', adminAuth, productController.removeProductOffer)
//block and unblock products
router.patch('/blockProduct', adminAuth, productController.blockProduct)
router.patch('/unBlockProduct', adminAuth, productController.unBlockProduct)
//edit product
router.get('/editProduct', adminAuth, productController.getEditProduct)
router.patch('/editProduct/:id', adminAuth, uploads.array('images', 3), productController.editProduct)
router.delete('/deleteImage', adminAuth, productController.deleteSingleImage)


//order management
router.get('/orders',adminAuth,orderController.getOrder)
router.get('/orderDetail/:id',adminAuth,orderController.getOrderDetail)
router.patch('/updateOrderStatus/:id',adminAuth,orderController.updateOrderStatus)
router.patch('/returnStatus/:id',adminAuth,orderController.returnStatus)
router.patch('/itemReturnStatus/:id',adminAuth,orderController.itemReturnStatus)

//coupon management
router.get('/coupon',adminAuth,couponController.getCoupon)
router.post('/createCoupon',adminAuth,couponController.createCoupon)
router.delete('/deleteCoupon/:id',adminAuth,couponController.deleteCoupon)

//sales report
router.get('/salesReport',adminAuth,adminController.getSalesReport)

//download pdf and excel
router.get('/downloadSalesPdf',adminAuth,adminController.downloadSalesPDF)
router.get('/downloadSalesExcel',adminAuth,adminController.downloadSalesExcel) 


module.exports = router 