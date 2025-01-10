const mongoose = require('mongoose')
const {Schema} = mongoose

const productSchema = new Schema({
    productTitle:{
        type:String,

    },
    description:{
        type:String,

    },
    brand:{
        type:String,
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    regularPrice:{
        type:Number,

    },
    offerPrice:{
        type:Number,

    },
    productOffer:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,

    },
    productImage:{
        type:[String],

    },
    capacity:{
        type:String,
        enum:["30ml","50ml","75ml","100ml"],
 
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