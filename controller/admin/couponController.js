const Coupon = require('../../model/couponSchema')
const moment = require('moment')


const getCoupon = async (req,res) => {
    try {

        const coupons = await Coupon.find()

        coupons.forEach((item) => {
                item.expire = moment(item.endDate).format('DD-MM-YYYY')
        })

        coupons.reverse()

        res.render('admin/coupon',{
            coupons:coupons
        })
        
    } catch (error) {
        console.error('coupon page Error',error)
        res.redirect('/admin/pageError')
    }
}


const createCoupon = async (req,res) => {
    try {

        const { code,
          discountValue,
          minValue,
          totalUsageLimit,
          startDate,
          endDate } = req.body


        const existingCoupon = await Coupon.findOne({code:code})

        if(existingCoupon){
            return res.json({status:false,message:'Coupon code already exists'})
        }

        const newCoupon = new Coupon({
            code,
            discountValue,
            minValue,
            totalUsageLimit,
            startDate,
            endDate
        })

        await newCoupon.save()
        
        res.json({status:true,message:'Coupon created successfully'})

    } catch (error) {
        console.error('erro while creating coupon',error)
        res.redirect('/admin/pageError')
    }
}


const deleteCoupon = async (req,res) => {
    try {

        const code = req.params.id

        const coupon = await Coupon.findOneAndDelete({code:code})

        if(!coupon){
            return res.json({status:false,message:'Coupon not found'})
        }

        res.json({status:true,message:'Coupon deleted'})
        
    } catch (error) {
        console.error('coupon deleting error',error)
        res.status(500).json({status:false,message:'Server internal Error'})
    }
}


module.exports = {
    getCoupon,
    createCoupon,
    deleteCoupon
}