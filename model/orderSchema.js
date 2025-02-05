const mongoose = require('mongoose')
const {Schema} = mongoose


const orderSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
      },
      products: [
        {
          product: { 
            type: Schema.Types.ObjectId, 
            ref: 'Product', 
            required: true 
          },
          quantity: { 
            type: Number, 
            required: true, 
            default: 1 
          },
          price: { 
            type: Number, 
            required: true 
          }
        }
      ],
      totalPrice: { 
        type: Number, 
        required: true 
      },
      address: {
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
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
      },
      paymentMethod: {
        type: String,
        enum: ['COD', 'Online'],
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
})



const Order = mongoose.model('Order',orderSchema)
module.exports = Order 