const express = require('express')
const router = express.Router()
const adminController = require('../controller/admin/adminController')
const customerController = require('../controller/admin/customerController')
const categoryController = require('../controller/admin/categoryController')
const brandController = require('../controller/admin/brandController')
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



//brand management
router.get('/brands',adminAuth,brandController.getBrandPage)
router.post('/addBrand',adminAuth,uploads.single('image'),brandController.addBrand)
router.get('/blockBrand',adminAuth,brandController.blockBrand)
router.get('/unBlockBrand',adminAuth,brandController.unBlockBrand)
router.get('/deleteBrand',adminAuth,brandController.deleteBrand)

module.exports = router