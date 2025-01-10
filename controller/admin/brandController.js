const { status } = require('init')
const Brand = require('../../model/brandSchema')
const Product = require('../../model/productSchema')



const getBrandPage = async (req,res) =>{
    try {
        const page = parseInt(req.query.page) || 1

        const limit = 4
        const skip = (page-1)*limit
        const brandData = await Brand.find({})
        .sort({createAt:-1})
        .skip(skip)
        .limit(limit)

        const totalBrands = await Brand.countDocuments()
        const totalPages = Math.ceil(totalBrands/limit)
        const reverseBrand = brandData.reverse()

        res.render('admin/brands',{
            data:reverseBrand,
            totalPages:totalPages,
            currentPage:page,
            totalBrands:totalBrands
        })

    } catch (error) {
        consoel.error('brandpage error',error)
        res.redirect('/admin/pageError')
    }
}




const addBrand = async (req,res) => {
    try {
        
        const brand = req.body.name
        const findBrand = await Brand.findOne({brand})
        if(!findBrand){
            const image = req.file.filename
            const newBrand = new Brand({
                brandName : brand,
                brandImage : image 
            })

            await newBrand.save()
            res.redirect('/admin/brands')
        }
    } catch (error) {
        console.error('Add brand error',error)
        res.rediect('/admin/pageError')
    }
}




const blockBrand = async (req,res) =>{
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}})

        res.json({status:true})
    } catch (error) {
        console.error('block brand error',error)
    }
    
}


const unBlockBrand = async (req,res) => {
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}})

        res.json({status:true})
    } catch (error) {
        console.error('unblock brand error',error)
        res.status(500).redirect('/admin/pageError')
    }
}



const deleteBrand = async (req,res) => {
    try { 
        const id = req.query.id

        await Brand.deleteOne({_id:id})

        res.json({status:true})
    } catch (error) {
        console.error('delete brand error',error)
        res.status(500).rediect('/admin/pageError')
    }
}



module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand
}