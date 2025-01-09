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
        console.error('Category page error',error)
        res.redirect('/pageError')        
    }
}


const addCategory = async (req,res) => {
    try {
    
        const {name,description} = req.body 
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(400).json({error:'Category already exists'})
        }

        const newCategory = new Category({
            name,
            description
        })

        await newCategory.save()
        return res.json({message:'Category added successfully'})
        
    } catch (error) {
        console.error('Error in addCategory',error)
        return res.status(500).json({error:'Internal Server error'})
    }
}



const addCategoryOffer = async (req,res)=>{
    console.log('add category offer')
     try {
        console.log('try')
        const percentage = parseInt(req.body.percentage)
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)

        if(!category){
            return res.status(404).json({status:false,message:'Category not found'})
        }

        const products = await Product.find({category:category._id})
        console.log('this is product',products)
        const hasProductOffer = products.some((product)=>product.productOffer > percentage)
        if(hasProductOffer){
            return res.json({status:false,message:'Products within this category alread have Product Offers'})
        }

        console.log('update')

        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}})

        for(const product of products){
            product.productOffer = 0,
            product.salePrice = product.regularePrice
            await products.save()
        }
        console.log('this is ',products) 

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

        const percentage = category.categoryOffer
        const products = await Product.find({category:category._id})


        if(products.length > 0){
            for(const product of products){
                product.salePrice += Math.floor(product.regularPrice * (percentage/100))
                product.productOffer = 0 
                await product.save()
            }
        }


        category.categoryOffer = 0
        await category.save()
        return res.json({status:true})

    } catch (error) {
        console.error('Error in removing category Offer',error)
        res.status(500).json({status:false,message:'Internal server error'})
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer
}