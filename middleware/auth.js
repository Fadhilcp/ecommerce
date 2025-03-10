const User = require('../model/userSchema')
const Product = require('../model/productSchema')
const mongoose = require('mongoose')


const userAuth = (req, res, next) => {
     if (req.session.user) {
         return next() 
        } else {
             return res.redirect('/login') 
            } 
        }




const isBlock = async (req, res, next) => {
    if (req.session.user) { 
        try { 
            const user = await User.findById(req.session.user)
            if(!user){
                return res.redirect('/pageError')
            }
             if (!user.isBlocked) { 
                next() 
            } else {
                return res.redirect('/') 
                }
            } catch (error) {
                res.redirect('/pageError')
            } 
        } else {
            next()
        }
    }




const adminAuth = async (req,res,next) => {
    try {

        if(req.session?.admin){
            next()
        }else{
            res.redirect('/admin/login')
        }
    } catch (error) {
        res.status(500).json('Internal server error')
    }
}



const productIsBlock = async (req,res,next) => {
    try {
        const productId = req.query.id

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            console.error('Invalid Product ID:', productId);
            return res.redirect('/pageError')
        }

        const product = await Product.findById(productId)

        if(!product){
            return res.redirect('/pageError')
        }

        if(product.isBlocked){
            return res.redirect('/')
        }
            next()

    } catch (error) {
        res.status(500).json('Internal server error')
    }
}




module.exports = {
    userAuth,
    adminAuth,
    isBlock,
    productIsBlock
}