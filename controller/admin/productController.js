const User = require('../../model/userSchema')
const Category = require('../../model/categorySchema')
const Product = require('../../model/productSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')




const getAddProducts = async (req,res)=>{
    try {
        
        const category = await Category.find({isListed:true})

        res.render('admin/products',{
            cat:category
        })

    } catch (error) {
        console.error('product page error',error)
        res.redirect('/admin/pageError')
    }
}


const addProducts = async (req,res)=>{
    try {
        console.log('add products..')
        const products = req.body
        const productExists = await Product.findOne({
            productName:products.productName,
        })

        if(!productExists){
            console.log('product not exist')
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
                return res.status(400).join('invalid category name')
            }
    
            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                offerPrice:products.offerPrice,
                createdOn:new Date(),
                quantity:products.quantity,
                capacity:products.capacity,
                productImage:images,
                statu:'Available'
    
            })
    console.log('product saved')
            await newProduct.save()
            return res.redirect('/admin/addProducts')


        }else{
            return res.status(400).json('Product already exist,please try with another name')
        }
    } catch (error) {
        console.error('Error saving product',error)
        return res.redirect('/admin/pageError')
    }
}



module.exports = {
    getAddProducts,
    addProducts
}