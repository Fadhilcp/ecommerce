const User = require('../../model/userSchema')
const Category = require('../../model/categorySchema')
const Product = require('../../model/productSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { status } = require('init')




const getAddProducts = async (req,res)=>{
    try {
        
        const category = await Category.find({isListed:true})

        res.render('admin/addProducts',{
            cat:category
        })

    } catch (error) {
        console.error('product page error',error)
        res.redirect('/admin/pageError')
    }
}


const addProducts = async (req,res)=>{

    try {
        const products = req.body
        const productExists = await Product.findOne({
            productName:products.productName
        })

        if(!productExists){
            const images = []
            if(req.files && req.files.length > 0){
                for(let i=0;i<req.files.length;i++){
                   
                    const originalImagePath = req.files[i].path
                    const resizedImagePath = path.join('public','uploads','productImages',req.files[i].filename)
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath)
                    images.push(req.files[i].filename)
                }
            }


            const categoryId = await Category.findOne({name:products.category})

            if(!categoryId){
                return res.json({status:false,message:'Category not found'})
            }
            products.productOffer = Math.floor(((products.regularPrice - products.offerPrice) / products.regularPrice) * 100)
    
            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                offerPrice:products.offerPrice,
                productOffer:products.productOffer,
                createdAt:new Date(),
                quantity:products.quantity,
                capacity:products.capacity,
                productImage:images,
                status:'Available'
            })
    
            await newProduct.save()

            return res.json({status:true,redirectUrl:'/admin/addProducts'})


        }else{
            return res.json({status:false,message:'Product already exist,please try with another name'})
        }
    } catch (error) {
        console.error('Error saving product',error)
        return res.json({status:false,redirectUrl:'/admin/pageError'})
    }
}



const getAllProducts = async (req,res) => {
    try {
        const search = req.query.search || ''
        const page = req.query.page || 1
        const limit = 4

        const productData = await Product.find({
            productName :{$regex:new RegExp('.*'+search+'.*','i')}
        })
        .limit(limit*1)
        .skip((page -1) * limit)
        .populate('category')
        .exec()

        const count = await Product.find({
            productName :{$regex:new RegExp('.*'+search+'.*','i')}
        }).countDocuments()

        const category = await Category.find({isListed:true})

        if(category){
           return res.render('admin/products',{
                data:productData,
                currentPage:page,
                totalPages:page,
                totalPages:Math.ceil(count / limit),
                cat:category
            })
        }else{
            res.render('admin/pageError')
        }

    } catch (error) {
        console.error('Product page error',error)
        res.redirect('/admin/pageError')
    }
}




const addProductOffer = async (req,res) => {
    try {
        const {percentage,productId} = req.body
        const findProduct = await Product.findOne({_id:productId})
        const findCategory = await Category.findOne({_id:findProduct.category})

        if(findCategory.categoryOffer > percentage){
            return res.json({status:false,message:'This product Category has a Category Offer'})
        }

        findProduct.offerPrice = findProduct.offerPrice - Math.floor(findProduct.regularPrice*(percentage/100))
        findProduct.productOffer = parseInt(percentage)
        await findProduct.save()
        findCategory.categoryOffer = 0
        await findCategory.save()
        
        res.json({status:true})


    } catch (error) {
        res.redirect('/admin/pageError')
        res.status(500).json({status:false,message:'Internal server error'})
    }
}




const removeProductOffer = async (req,res) => {
    try { 
        const {productId} = req.body

        const findProduct = await Product.findOne({_id:productId})
        const percentage = findProduct.productOffer
              
        findProduct.offerPrice = findProduct.offerPrice + Math.floor(findProduct.regularPrice*(percentage/100))

        findProduct.productOffer = 0
        await findProduct.save()
        res.json({status:true})

    } catch (error) {
        res.redirect('/admin/pageError')
        res.status(500).json({status:false,message:'Internal server error'})
    }
}




const blockProduct = async (req,res)=>{
    try {
        const { productId } = req.body

        await Product.updateOne({_id:productId},{$set:{isBlocked:true}},{new:true})

        res.json({status:true,message:'Product blocked successfully'})
    } catch (error) {
        console.error('block product error',error)
        res.redirect('/admin/pageError')
    }
}


const unBlockProduct = async (req,res)=>{
    try {
        const { productId } = req.body

        await Product.updateOne({_id:productId},{$set:{isBlocked:false}},{new:true})

        res.json({status:true,message:'Product unblocked successfully'})
    } catch (error) {
        console.error('Unblock product error')
        res.redirect('/admin/pageError')
    }
}





const getEditProduct = async (req,res) => {
    try {
        const id = req.query.id

        const product = await Product.findOne({_id:id})
        const category = await Category.find({})

        return res.render('admin/editProduct',{
            product:product,
            cat:category
        })
    } catch (error) {
        console.error('edit Product page error',error)
        res.redirect('/admin/pageError')
    }
}


const editProduct = async (req,res)=>{
    try {

        const id = req.params.id
        const product = await Product.findOne({_id:id})

        const data = req.body

        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })

        const category = await Category.findOne({_id:data.category})

        if(existingProduct){
            return res.json({status:false,message:'Product with this name is already exists'})
        }

        const images = []

        if(req.files && req.files.length >= 0){
            for(let i=0;i<req.files.length;i++){
                images.push(req.files[i].filename)
            }
        }

        data.productOffer = Math.floor(((data.regularPrice - data.offerPrice) / data.regularPrice) * 100)

        const updateFields = {
            productName:data.productName,
            description:data.description,
            category:category._id,
            regularPrice:data.regularPrice,
            capacity:data.capacity,
            offerPrice:data.offerPrice,
            productOffer:data.productOffer,
            quantity:data.quantity
        }

        if(req.files.length > 0){
            updateFields.$push = {productImage:{$each:images}}
        }

        await Product.findByIdAndUpdate(id,updateFields,{new:true})

        return res.json({status:true,redirectUrl:'/admin/products'})
    } catch (error) {
        console.error('edit product error',error)
        res.redirect('/admin/pageError')

    }
}




const deleteSingleImage = async (req,res) => {
    try {

        const {imageId,productId} = req.params

        await Product.findByIdAndUpdate({_id:productId},{$pull:{productImage:imageId}})

        const imagePath = path.join('public','uploads','reImage',imageId)

        if(fs.existsSync(imagePath)){

            await fs.unlinkSync(imagePath)
            console.log(`Image ${imageId} deleted successfully`)
        }else{
            console.log(`image ${imageId} not found`)
        }

        res.send({status:true})

    } catch (error) {
        console.error('delete image error',error)
        res.redirect('/admin/pageError')
    }
}


module.exports = {
    getAddProducts,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}