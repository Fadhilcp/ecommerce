const mongoose = require('mongoose')
const {Schema} = mongoose

const userReviewSchema = new Schema({
    username:{
        type:String,
        required:true,
        trim:true,
    },
    description:{
        type:String,
        required:true,
        trim:true
    },
    createAt:{
        type:Date,
        default:Date.now
    }
})


const Review = mongoose.model('Review',userReviewSchema)

module.exports = Review