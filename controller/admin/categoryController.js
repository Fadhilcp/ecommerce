const Category = require('../../model/categorySchema')
const Product = require('../../model/productSchema')



const categoryInfo = async (req,res) => {
    try {
        
        const page = parseInt(req.query.page) || 1
        const limit = 4
        const skip = (page-1)*limit

        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments()
        const totalPages = Math.ceil(totalCategories/limit)
        
        res.render('admin/category',{ 
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories
        })

    } catch (error) {
        res.redirect('/admin/pageError')        
    }
}


const addCategory = async (req,res) => {
    try {
    
        const {name,description} = req.body 
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(400).json({status:false,message:'Category already exists'})
        }

        const newCategory = new Category({
            name,
            description
        })

        await newCategory.save()
        return res.json({status:true,message:'Category added successfully'})
        
    } catch (error) {
        return res.status(500).json({status:false,message:'Internal Server error'})
    }
}



const addCategoryOffer = async (req,res)=>{
     try {
        const percentage = parseInt(req.body.percentage)
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)


        if(!category){
            return res.status(404).json({status:false,message:'Category not found'})
        }

        const products = await Product.find({category:category._id})


        const hasProductOffer = products.some((product)=>product.productOffer > percentage)
        if(hasProductOffer){
            return res.json({status:false,message:'Products within this category already have Product Offers'})
        }
 
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}})

        for (const product of products) {

            const discountAmount = product.regularPrice * (percentage / 100)
            product.offerPrice = product.regularPrice - discountAmount
            product.productOffer = percentage

            await product.save()
        }

        return res.json({status:true})  

     } catch (error) {
        res.status(500).json({status:false,message:'Internal server error'})
     }
}




const removeCategoryOffer = async(req,res) =>{
    try {
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)

        if(!category){
            return res.status(404).json({status:false,message:'Category not found'})
        }

        const products = await Product.find({category:category._id})


        if (products.length > 0) {
            for (const product of products) {

                product.offerPrice = product.regularPrice
                product.productOffer = 0

                await product.save()
            }
        }

        category.categoryOffer = 0
        await category.save()
        return res.json({status:true})

    } catch (error) {
        res.status(500).json({status:false,message:'Internal server error'})
    }
}




const listCategory = async (req,res)=>{
    try {
         
        const { categoryId } = req.body

        await Category.updateOne({_id:categoryId},{$set:{isListed:false}})

        return res.json({status:true})
    } catch (error) {
        res.status(500).json({status:false,message:'Internal server error'})
    }
}



const unlistCategory = async (req,res)=>{
    try {

        const { categoryId } = req.body

        await Category.updateOne({_id:categoryId},{$set:{isListed:true}})

        return res.json({status:true})

    } catch (error) {
        return res.json({status:false,message:'Internal server error'})
    }
}



const getEditCategory = async (req,res) => {
     try {

        let id = req.query.id

        const category = await Category.findOne({_id:id})
        res.render('admin/editCategory',{category:category}) 

     } catch (error) {
        res.redirect('/admin/pageError')
     }
}



const editCategory = async (req,res) => {
    try {
        
        const id = req.params.id
        const {categoryName,description} = req.body
 
        const existingCategory = await Category.findOne({name:categoryName})

        if(existingCategory){
            return res.json({status:false,message:'Category exists, please choose another name'})
        }

        const updateCategory = await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description
        },{new:true})

        if(updateCategory){
            return res.json({status:true,redirectUrl:'/admin/category'})
        }else{
            res.status(404).json({status:false,message:'Category not found'})
        }
    } catch (error) {
        res.status(500).json({status:false,message:'Internal server error'})
    }
}


module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    listCategory,
    unlistCategory,
    getEditCategory,
    editCategory
}