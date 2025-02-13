const mongoose = require('mongoose')
const {Schema} = mongoose


const orderSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
      },
      orderId: {
        type:String
      },
      products: [
        {
          product: { 
            type: Schema.Types.ObjectId, 
            ref: 'Product', 
            required: true 
          },
          productName:{
            type:String,
            required:true
          },
          capacity:{
            type:String,
            required:true
          },
          productImage:{
            type:String,
            required:true
          },
          quantity: { 
            type: Number, 
            required: true, 
            default: 1 
          },
          price: { 
            type: Number, 
            required: true 
          },
          cancelStatus:{
            type:String,
            enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled','Requested','Approved','Rejected'], 
            default: 'Pending' 
          },
          itemCancelReason: {
            type: String,
            default:''
          },
          refundStatus: {
            type:String,
            enum:['Requested','Approved','Rejected']
          },
          refundReason: {
            type:String
          }
        }
      ],
      totalPrice: { 
        type: Number, 
        required: true 
      },
      finalPrice: { 
        type: Number,
        required: true
      },
      address: {
        name:{
          type:String,
          required:true
        },
        houseNo: { 
          type: String, 
          required: true 
        },
        street: { 
          type: String, 
          required: true 
        },
        city: { 
          type: String, 
          required: true 
        },
        state: { 
          type: String, 
          required: true 
        },
        phone: { 
          type: Number, 
          required: true 
        },
        pincode: { 
          type: Number, 
          required: true 
        }
      },
      status: {
        type: String,
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Requested', 'Approved', 'Rejected'],
        default: 'Pending'
      },
      paymentStatus: {
        type: String, 
        enum: ['Pending', 'Paid', 'Failed'], 
        default: 'Pending'
      },
      refundStatus: {
        type:String,
        enum:['Requested','Approved','Rejected']
      },
      refundReason: {
        type:String
      },
      orderCancelReason: {
        type: String,
        default:''
      },
      paymentMethod: {
        type: String,
        enum: ['COD', 'RazorPay'],
        required: true
      },
      coupon: {
          type:String
      }
    },
    { timestamps: true }
)



const Order = mongoose.model('Order',orderSchema)
module.exports = Order