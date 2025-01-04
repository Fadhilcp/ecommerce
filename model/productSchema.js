const mongoose = require('mongoose')
const {Schema} = mongoose

const productSchema = new Schema({
    productTitle:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    brand:{
        type:String,
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    regularPrice:{
        type:Number,
        required:true
    },
    offerPrice:{
        type:Number,
        required:true
    },
    quantity:{
        type:Number,
        default:true
    },
    productImage:{
        type:[String],
        required:true
    },
    capacity:{
        type:String,
        enum:["30ml","50ml","75ml","100ml"],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","Out of Stock","Discountinued"],
        required:true,
        default:"Available"
    }
},{timestamps:true})


const Product = mongoose.model("Product",productSchema)

module.exports = Product