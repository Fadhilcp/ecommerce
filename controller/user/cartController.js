const Product = require('../../model/productSchema')
const User = require('../../model/userSchema')
const Cart = require('../../model/cartSchema')



const getCart = async (req,res) => {
    try {

        const userId = req.session.user

        if(!userId){
            return res.redirect('/login')
        }

        const cart = await Cart.findOne({userId}).populate('products.productId')

        return res.render('user/cart',{
            active: 'shop',
            cartItems: cart ? cart.products.map(item => ({
                _id: item.productId._id,
                name: item.productId.productName,
                image: item.productId.productImage[0],
                price: item.productId.offerPrice,
                capacity:item.productId.capacity,
                quantity: item.quantity,
                total: item.productId.offerPrice * item.quantity
            })) : [],
            totalPrice: cart ? cart.products.reduce((sum, item) => sum + (item.productId.offerPrice * item.quantity), 0) : 0,
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

        const {productId} = req.body


        const product = await Product.findById(productId)

        if(!product){
            return res.json({status:false,message:'Product not found'})
        }

        let cart = await Cart.findOne({userId:userId})

        if(!cart){
            cart = new Cart({userId,products:[]})
        }

        let existingProduct = cart.products.find(item => item.productId.toString() === productId)

        if(existingProduct){
            if (existingProduct.quantity < 5) {
                existingProduct.quantity += 1
            } else {
                return res.json({status:false,message:'Maximum quantity reached(5)'})
            }
            
        }else{
            cart.products.push({ 
                productId,
                quantity: 1,
                price:product.offerPrice
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
        
        if(product){
            product.quantity = quantity
            await cart.save()

            let newTotalPrice = cart.products.reduce((sum, item) => 
                sum + (item.price * item.quantity),0)

            return res.json({ status: true,newTotal:newTotalPrice})
        }

        res.json({ status: false, message: "Product not found in cart" })
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

module.exports = {
    getCart,
    addToCart,
    updateCartQuantity,
    deleteCartItem
}