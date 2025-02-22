const mongoose = require('mongoose')
const {Schema} = mongoose


const couponSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
      },
      discountValue: {
        type: Number,
        required: true,
      },
      minValue: {
        type: Number,
        default: 0, 
      },
      totalUsageLimit: {
        type: Number, 
      },
      isActive: {  
        type: Boolean,
        default: true
     },
      startDate: {
        type: Date,
        required: true, 
      },
      endDate: {
        type: Date,
        required: true, 
      }
},{timestamps: true})


const Coupon = mongoose.model('Coupon',couponSchema)
module.exports = Coupon