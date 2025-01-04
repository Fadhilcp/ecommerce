const mongoose = require("mongoose")
const {Schema} = mongoose

const addressSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    address : [{
        addressType:{
            type:String,
            required:true
        },
        houseNo:{
            type:String,
            required:true
        },
        street:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        country:{
            type:String,
            required:true
        },
        pincode:{
            type:Number,
            required:true
        },
        phone:{
            type:String,
            required:true
        }
    }]
})


const Address = mongoose.model("Adress",addressSchema)

module.exports = Address 