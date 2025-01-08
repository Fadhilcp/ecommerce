const Category = require('../../model/categorySchema')



const categoryInfo = async (req,res) => {
    try {
        
        const page = parseInt(req.query.page) || 1
        const limit = 4
        const skip = (page-1)*limit

        const categoryData = Category.find({})
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

        const {email,description} = req.body
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(500).json({error:'Category already exists'})
        }

        const newCategory = new Category({
            name,
            description
        })

        await newCategory.save()
        return res.json({message:'Category added successfully'})
        
    } catch (error) {
        return res.status(500).json({error:'Internal Server error'})
    }
}


module.exports = {
    categoryInfo,
    addCategory 
}