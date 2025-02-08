const Product = require('../../model/productSchema')
const User = require('../../model/userSchema')
const Cart = require('../../model/cartSchema')
const Wishlist = require('../../model/wishlistSchema')



const getCart = async (req,res) => {
    try {

        const userId = req.session.user

        if(!userId){
            return res.redirect('/login')
        }

        const cart = await Cart.findOne({userId}).populate('products.productId')

        if(!cart){
            return res.redirect('/shop')
        }

        const cartItems = cart.products.map(item => ({
            _id: item.productId._id,
            name: item.productId.productName,
            image: item.productId.productImage[0],
            price: item.productId.offerPrice,
            capacity:item.productId.capacity,
            quantity: item.quantity,
            total: item.productId.offerPrice * item.quantity
        }))

        const totalPrice = cartItems.reduce((sum,item) => sum + item.total,0) 

        return res.render('user/cart',{
            active: 'shop',
            cartItems:cartItems,
            totalPrice:totalPrice,
            active:'cart',
            user:userId
        })
        
    } catch (error) {
        console.error('Cart page error',error)
        return res.redirect('/pageError')
    }
}


const addToCart = async (req,res) => {
    try {
        const userId = req.session.user

        if(!userId){
            return res.json({status:false,redirectUrl:'/login'})
        }

        const {productId,quantity} = req.body
        const product = await Product.findById(productId)

        if(!product){
            return res.json({status:false,message:'Product not found'})
        }

        let cart = await Cart.findOne({userId:userId})

        if(!cart){
            cart = new Cart({userId,products:[]})
        }

        let existingProduct = cart.products.find(item => item.productId.toString() === productId)


        if (existingProduct) {
            let totalQuantity = existingProduct.quantity + quantity;

            if (totalQuantity > 5) {
                return res.json({ status: false, message: 'Maximum quantity reached (5)' })
            }
            if (totalQuantity > product.quantity) {
                return res.json({ status: false, message: 'Not enough stock available' })
            }

            existingProduct.quantity += quantity;

        } else {
            if (quantity > 5) {
                return res.json({ status: false, message: 'Maximum quantity per product is 5' })
            }

            if (quantity > product.quantity) {
                return res.json({ status: false, message: 'Not enough stock available' })
            }

            cart.products.push({ 
                productId,
                quantity: quantity,
                price: product.offerPrice
            })
        }

        await cart.save()
        return res.json({status:true})

    } catch (error) {
        console.error('cart page error',error)
        res.redirect('/pageError')
    }
}





    const updateCartQuantity = async (req,res) => {
        try {

            const { productId, quantity } = req.body
            const userId = req.session.user


            let cart = await Cart.findOne({userId:userId})
            if(!cart){
                return res.json({status:false,message:'Cart not found'})
            }

            let product = cart.products.find(item => item.productId.toString() === productId)
            if (!product) {
                return res.json({ status: false, message: "Product not found in cart" })
            }


            let productData = await Product.findById(productId) 
            if (!productData) {
                return res.json({ status: false, message: "Product not found" })
            }

            if (quantity > productData.quantity) {

                product.quantity = productData.quantity

                await cart.save()

                let totalPrice = cart.products.reduce((sum, item) => 
                    sum + (item.price * item.quantity),0)

                return res.json({ status: false, message: "Not enough stock available", newTotal:totalPrice , availableStock: productData.quantity})
            }

            product.quantity = quantity

                await cart.save()

                let newTotalPrice = cart.products.reduce((sum, item) => 
                    sum + (item.price * item.quantity),0)

                return res.json({ status: true,newTotal:newTotalPrice, availableStock: productData.quantity})
            
        } catch (error) {
            console.error('Error updating cart:', error)
            res.status(500).json({ status: false, message: "Internal server error" })
        }
    }



const deleteCartItem = async (req,res) => {
    try {

        const userId = req.session.user
        const itemId = req.params.id

        const cart = await Cart.findOne({userId:userId})

        if(!cart){
            return res.json({status:false,message:'Cart not found'})
        }

        const itemIndex = await cart.products.findIndex(item => item.productId.toString() === itemId)

        if(itemIndex === -1){
            return res.json({status:false,message:'Item not found in Cart'})
        }

        cart.products.splice(itemIndex,1)

        await cart.save()

        return res.json({status:true,message:'Item removed successfully'})
    } catch (error) {
        console.error('Error deleting cart item',error)
        return res.status(500).json({status:false,message:'Internal server error'})
    }
}








const getWishlist = async (req,res) => {
    try {

        const userId = req.session.user

        if(!userId) return res.redirect('/login')

        const wishlist = await Wishlist.findOne({userId:userId}).populate('products.productId')

        
        
        res.render('user/wishlist',{
            user:userId,
            active:'wishlist',
            products: wishlist ? wishlist.products : []
        })
        
    } catch (error) {
        console.error('wishlist page error',error)
        res.redirect('/pageError')
    }
}


const addToWishlist = async (req,res) => {
    try {

        const {productId} = req.body
        const userId = req.session.user

        if(!userId){
            return res.json({status:false,message:'Please Login!'})
        }

        let wishlist = await Wishlist.findOne({userId:userId})

        if(!wishlist){
            wishlist = new Wishlist({userId,products:[]})
        }

        const existProduct = wishlist.products.some(product => 
            product.productId.toString() === productId.toString()
        )

        if (existProduct){
            return res.json({status:false,message:'"Product already in wishlist" '})
        }

        wishlist.products.push({
            productId:productId
    })

        await wishlist.save()

        res.json({status:true,message:'Product added to Wishlist'})
        
    } catch (error) {
        console.error('Error while adding product to wishlist',error)
        res.json({status:false,message:'Internal sever Error'})
    }
}







module.exports = {
    getCart,
    addToCart,
    updateCartQuantity,
    deleteCartItem,
    getWishlist,
    addToWishlist
}