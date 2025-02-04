const Product = require('../../model/productSchema')
const User = require('../../model/userSchema')
const Category = require('../../model/categorySchema')
const Review = require('../../model/userReviewSchema')




const productDetails = async (req,res) => {
    try {

        const userId = req.session.user

        const userData = await User.findById(userId)
        const productId = req.query.id
        const product = await Product.findById(productId).populate('category')
        const findCategory = product.category
        const categoryOffer = findCategory ?.category || 0
        const productOffer = product.productOffer || 0
        const totalOffer = categoryOffer + productOffer

        if(!product){
           return res.redirect('/pageError')
        }

        const similarProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: productId }
        }).limit(5)

       return res.render('user/productDetails',{
            user:userData,
            product:product,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory,
            similarProducts:similarProducts,
            active:'shop'
        })

    } catch (error) {
        console.error('product Details error',error)
        res.redirect('/page404')
    }
}



const addReviews = async (req,res)=>{
    try {
        const user = req.body.userId
        const description = req.body.description

        const userData = await User.findById(user)

        if(!userData){
           return res.json({status:false})
        }

        const review = new Review({
            username:userData.username,
            description:description,
            createAt:new Date()
        })
        await review.save()
        res.json({status:true})

    } catch (error) {
        console.error('review adding error',error)
        res.status(500).json('Internal server error')
    }
}



module.exports = {
    productDetails,
    addReviews
}