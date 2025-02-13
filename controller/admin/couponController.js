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
          maxValue,
          totalUsageLimit,
          startDate,
          endDate,
          description } = req.body


        const existingCoupon = await Coupon.findOne({code:code})

        if(existingCoupon){
            return res.json({status:false,message:'Coupon code already exists'})
        }

        const newCoupon = new Coupon({
            code,
            discountValue,
            minValue,
            maxValue,
            totalUsageLimit,
            description,
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


module.exports = {
    getCoupon,
    createCoupon
}