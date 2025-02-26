const Product = require('../../model/productSchema')
const User = require('../../model/userSchema')
const Cart = require('../../model/cartSchema')
const Address = require('../../model/addressSchema')
const Order = require('../../model/orderSchema')
const Wallet = require('../../model/walletSchema')
const Coupon = require('../../model/couponSchema')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const env = require('dotenv').config()
const PDFDocument = require('pdfkit')


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
})


function customOrderId(){
    const timestamp = Date.now().toString().slice(-6)
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `ORD-${timestamp}-${randomNum}`
}


const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user
        const { addressId, paymentMethod } = req.body

        const user = await User.findById(userId)
        const addressData = await Address.findOne({ userId: userId })

        if (!addressData) {
            return res.json({ status: false, message: 'Please add Address' })
        }

        const selectedAddress = addressData.address.find(item => item._id.toString() === addressId)

        const cart = await Cart.findOne({ userId: userId }).populate('products.productId')

        // Checking stock
        for (const item of cart.products) {
            const product = await Product.findById(item.productId._id)

            if (product.quantity < item.quantity) {
                return res.json({ status: false, message: `Insufficient stock for product ${item.productId.productName}` })
            }
        }

        const cartItems = cart.products.map(item => ({
            product: item.productId._id,
            productName: item.productId.productName,
            capacity: item.productId.capacity,
            productImage: item.productId.productImage[0],
            quantity: item.quantity,
            price: item.productId.offerPrice * item.quantity
        }))

        const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0)

        let finalPrice = req.session.finalPrice && req.session.finalPrice <= totalPrice ? req.session.finalPrice : totalPrice
        const couponCode = req.session.couponCode

        const shippingFee = 40

        // Checking coupon
        if (couponCode) {
            const check = await Coupon.findOne({ code: couponCode })

            if (!check) {
                return res.json({ status: false, message: "Invalid coupon code" })
            }

            if (check.minValue > totalPrice) {
                return res.json({
                    status: false,
                    message: `The coupon is valid for orders greaterthan ${check.minValue}`
                })
            }

            if (check.totalUsageLimit <= 0) {
                return res.json({
                    status: false,
                    message: "This coupon has reached its usage limit"
                })
            }

            let discountAmount = Number(((totalPrice * check.discountValue) / 100).toFixed(2))
            finalPrice = Number((totalPrice - discountAmount).toFixed(2))
            
            await Coupon.findOneAndUpdate(
                { code: couponCode },
                { $inc: { totalUsageLimit: -1 } }
            )
            req.session.couponCode = null

        }

        finalPrice += shippingFee

        //razorpay
        if (paymentMethod === 'RazorPay') {
            const options = {
                amount: finalPrice * 100,
                currency: "INR",
                receipt: `order_${Date.now()}`
            }


            const razorpayOrder = await razorpay.orders.create(options)

            let paymentStatus = 'Failed'

            //temporary order
            const order = new Order({ 
                userId,
                orderId: customOrderId(),
                products: cartItems,
                totalPrice,
                finalPrice,
                address: {
                    name: user.username,
                    houseNo: selectedAddress.houseNo,
                    street: selectedAddress.street,
                    city: selectedAddress.city,
                    state: selectedAddress.state,
                    phone: selectedAddress.phone,
                    pincode: selectedAddress.pincode
                },
                coupon: couponCode,
                paymentMethod,
                paymentStatus
            })

            await order.save()

            await Cart.findOneAndUpdate({ userId: userId }, { products: [] })

            delete req.session.checkout
            req.session.orderId = order._id
            return res.json({ status: true, razorpayOrder })
        }

        // cash on delivery
        if (paymentMethod === 'COD' || paymentMethod === 'Wallet') {

            if(paymentMethod === 'COD' && finalPrice >= 1000){
                return res.json({status:false,message:'Products above 1000 is not allowed Cash on Delivery'})
            }

            let paymentStatus = 'Pending'

            if(paymentMethod === 'Wallet'){

                const wallet = await Wallet.findOne({userId:userId})

                if(wallet.balance < finalPrice){
                    return res.json({ status: false, message: 'Insufficient wallet balance' })
                }

                wallet.transaction.push({
                    transactionType: 'debit',
                    amount: finalPrice 
                })

                wallet.balance = Number((wallet.balance - finalPrice).toFixed(2))
                await wallet.save()

                paymentStatus = 'Paid'
            }

            const order = new Order({
                userId,
                orderId: customOrderId(),
                products: cartItems,
                totalPrice,
                finalPrice,
                address: {
                    name: user.username,
                    houseNo: selectedAddress.houseNo,
                    street: selectedAddress.street,
                    city: selectedAddress.city,
                    state: selectedAddress.state,
                    phone: selectedAddress.phone,
                    pincode: selectedAddress.pincode
                },
                coupon: couponCode,
                paymentStatus,
                paymentMethod
            })

            req.session.finalPrice = null
            await order.save()

            for (const item of cartItems) {
                await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } })
            }

            await Cart.findOneAndUpdate({ userId: userId }, { products: [] })

            delete req.session.checkout
            req.session.orderId = order._id

            return res.json({ status: true })
        }

    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal server issue' })
    }
}





const getOrderComplete = async (req,res) => {
    try {

        const userId = req.session.user
        const orderId = req.session.orderId

        const orderComplete = await Order.findById(orderId)

        if(!orderComplete){
            return res.redirect('/')
        }

        delete req.session.orderId

        res.render('user/orderComplete',{
            user:userId,
            active:'cart'
        })
        
    } catch (error) {
        res.redirect('/pageError')
    }
}


const cancelOrder = async (req,res) => {
    try {

        const userId = req.session.user
        const orderId = req.params.id 
        const {reason} = req.body

        const order = await Order.findById(orderId)

        if(!order){
            return res.json({status:false,message:'Order not found'})
        }

        if(order.status === 'Cancelled' || order.status === 'Delivered'){
            return res.json({status:false,message:`Order already ${order.status}`})
        }

        
        let refundAmount = order.finalPrice

        if(order.status !== 'Pending'){
            refundAmount =  order.finalPrice - order.shippingFee
        }

        order.status = 'Cancelled'
        order.orderCancelReason = reason

        order.products.forEach(product => {
            product.cancelStatus = 'Cancelled'
            product.itemCancelReason = 'Order cancelled'
        })

        await order.save()

        if(order.paymentStatus === 'Paid'){

            let wallet = await Wallet.findOne({userId:userId})

            if(!wallet){
                wallet = new Wallet({userId,transaction:[]})
            }


            wallet.balance = Number((wallet.balance + refundAmount).toFixed(2))

            wallet.transaction.push({
                transactionType: 'credit',
                amount: refundAmount
            })

            await wallet.save()
        }

        if(order.paymentStatus !== 'Failed'){

            for(const item of order.products){
                await Product.findByIdAndUpdate(item.product ,{
                    $inc:{ quantity: item.quantity}
                })
            }
        }

        return res.json({status:true,redirectUrl:'/orders'})

        
    } catch (error) {
        res.status(500).json({status:false,message:'error while cancel order'})
    }
}



const cancelItem = async (req,res) => {
    try {

        const orderId = req.params.id 
        const {productId,reason} = req.body

        const order = await Order.findById(orderId)

            const productIndex = order.products.findIndex(item => item.product.toString() === productId)

            if (productIndex === -1) {
                return res.json({ status: false, message: 'Product not found in order' })
            }
            
            if (order.products[productIndex].cancelStatus === 'Cancelled') {
                return res.json({ status: false, message: 'Product already cancelled' })
            }

            order.products[productIndex].cancelStatus = 'Cancelled'
            order.products[productIndex].itemCancelReason = reason

            //calculating refund amount
            let refundAmount = order.products[productIndex].price

            //if there is coupon
            if(order.coupon){
                const discountPercentage = (refundAmount - order.finalPrice) / refundAmount
                refundAmount -= refundAmount * discountPercentage
            }

            const userId = order.userId
            const wallet = await Wallet.findOne({userId:userId})

            if(!wallet){
                wallet = new Wallet({userId,transaction:[]})
            }

            if(order.paymentStatus !== 'Failed'){
                 
                if(order.paymentStatus === 'Paid'){
                    wallet.balance = Number((wallet.balance + refundAmount).toFixed(2))

                    wallet.transaction.push({
                        transactionType:'refund',
                        amount: refundAmount
                    })

                    await wallet.save()
                }

                await Product.findByIdAndUpdate(productId, {
                    $inc: { quantity: order.products[productIndex].quantity }
                })

            }

            order.finalPrice = Number((order.finalPrice - refundAmount).toFixed(2))
            if (order.finalPrice < 0) order.finalPrice = 0

              //cancelling order 
            const allCancelled = order.products.every(product => product.cancelStatus === 'Cancelled')

            if (allCancelled) {

                order.status = 'Cancelled'
                order.orderCancelReason = 'All products were cancelled by the user'
                order.finalPrice = Number((order.finalPrice - 40).toFixed(2))
                await order.save()
                return res.json({ status: true, message: 'All products cancelled, order marked as Cancelled' })
            }

            await order.save()

            return res.json({ status:true, message:'Product cancelled successfully'})
        
    } catch (error) {
        res.status(500).json({status:false,message:'Internal server error'})
    }
}



const returnOrder = async (req,res) => {
    try {

        const orderId = req.params.id 
        const {reason} = req.body

        const order = await Order.findById(orderId)

        if(!order){
            return res.json({status:false,message:'Order not found'})
        }
        order.status = 'Requested'
        order.refundStatus = 'Requested'
        order.refundReason = reason

        await order.save()

        return res.json({status:true,redirectUrl:'/orders'})

        
    } catch (error) {
        res.status(500).json({status:false,message:'error while cancel order'})
    }
}




const returnItem = async (req,res) => {
    try {

        const orderId = req.params.id 
        const {productId,reason} = req.body

        const order = await Order.findById(orderId)

        if (!order) {
            return res.json({ status: false, message: 'Order not found' })
        }

        const productIndex = order.products.findIndex(item => item.product.toString() === productId)

        if (productIndex === -1) {
            return res.json({ status: false, message: 'Product not found in order' })
        }

        if (order.products[productIndex].cancelStatus === 'Requested') {
            return res.json({ status: false, message: 'Product already requested to return' });
        }

        order.products[productIndex].cancelStatus = 'Requested'
        order.products[productIndex].refundStatus = 'Requested'
        order.products[productIndex].refundReason = reason

        await order.save()

        return res.json({status:true,message: 'Return request submitted successfully'})
        
    } catch (error) {
        res.status(500).json({status:false,message:'error while return Item'})
    }
}





const createOrder =  async (req, res) => {
    try {
        const { orderId, finalPrice } = req.body

        const options = {
            amount: finalPrice * 100,
            currency: "INR",
            receipt: `order_rcptid_${orderId}`
        }

        const order = await razorpay.orders.create(options)

        res.json({ success: true, razorpayOrder: order, key: process.env.RAZORPAY_KEY })
    } catch (error) {
        res.status(500).json({ success: false ,message:'Internal server error'})
    }
}

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body

        if(orderId) {
            req.session.orderId = orderId 
        }

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ status: false, message: "Invalid payment details" })
        }

        const key_secret = process.env.RAZORPAY_SECRET

        // Create hash using SHA256 HMAC
        const expectedSignature = crypto
            .createHmac('sha256', key_secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex')


        if (expectedSignature === razorpay_signature) {
   
            const orderID = req.session.orderId

            const order = await Order.findById(orderID)
            //changing payment status
            order.paymentStatus = 'Paid'
            
            await order.save()

            for (const item of order.products) {
                await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } })
            }

            return res.json({ status: true, message: "Payment verified, order placed successfully" })

        } else {
            return res.status(400).json({ status: false, message: "Payment verification failed" })
        }

    } catch (error) {
        res.status(500).json({ status: false, message: "Internal Server Error" })
    }
}



const downloadInvoice =  async (req, res) => {
    try {
        const orderId = req.params.id


        const order = await Order.findById(orderId).populate('userId')

        if (!order) {
            return res.status(404).json({ error: "Order not found" })
        }

        // Set response headers
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${orderId}.pdf`)
        res.setHeader("Content-Type", "application/pdf")

        // Create PDF 
        const doc = new PDFDocument({ margin: 50 })
        doc.pipe(res)

        doc.font("Helvetica-Bold").fontSize(22).fillColor("#333").text("PERFUMORA", { align: "center", underline: true })
        doc.moveDown(1)

        //Order Details Box
        doc.rect(50, doc.y, 500, 100).stroke()
        doc.moveDown(0.5)

        doc.fontSize(14).fillColor("#000").text(`Invoice Number: ${order.orderId}`, 60, doc.y + 10)
        doc.text(`Customer: ${order.userId.username}`, 60)
        doc.text(`Date: ${order.createdAt.toDateString()}`, 60)
        doc.text(`Total: $${order.finalPrice}`, 60)
        doc.moveDown(1)

       
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
        doc.moveDown(0.5)
    
        doc.fontSize(14).fillColor("#444").text("Items Purchased:", { underline: true })
        doc.moveDown(0.5)

        const tableTop = doc.y

        doc.fontSize(12).fillColor("#000")
        
        // Table Header Row
        doc.rect(50, tableTop, 500, 20).fill("#ddd")
        doc.fillColor("#000").text("No", 60, tableTop + 5)
        doc.text("Product Name", 110, tableTop + 5)
        doc.text("Quantity", 360, tableTop + 5)
        doc.text("Price", 460, tableTop + 5)
        
        // Table Rows
        let yPos = tableTop + 25;
        order.products.forEach((item, index) => {
            doc.fillColor("#000").text(index + 1, 60, yPos)
            doc.text(item.productName, 110, yPos)
            doc.text(`${item.quantity}`, 360, yPos)
            doc.text(`$${item.price.toFixed(2)}`, 460, yPos)
            yPos += 20
        })

        doc.moveDown()
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
        doc.moveDown(0.5)

        doc.rect(400, doc.y, 150, 30).fill("#eee")
        doc.fillColor("#000").fontSize(16).text(`Paid: $${order.finalPrice}`, 410, doc.y + 8, { bold: true })


        doc.moveDown(2);
        doc.fontSize(12).fillColor("#666").text("Thank you for shopping with us!", { align: "center", italic: true })

        doc.end()

    } catch (error) {
        res.status(500).json({status:false,message:'Internal server error'})
    }
}






module.exports = {
    placeOrder,
    getOrderComplete,
    cancelOrder,
    returnOrder,
    cancelItem,
    returnItem,
    createOrder,
    verifyPayment,
    downloadInvoice
}