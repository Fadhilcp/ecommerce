const Coupon = require('../../model/couponSchema')
const moment = require('moment')
const MESSAGES = require('../../constants/messages');


const getCoupon = async (req,res) => {
    try {
        const coupons = await Coupon.find({ isDeleted: false });

        coupons.forEach((item) => {
                item.expire = moment(item.endDate).format('DD-MM-YYYY')
        });

        coupons.reverse();
        res.render('admin/coupon',{ coupons:coupons });
        
    } catch (error) {
        res.redirect('/admin/pageError');
    }
}

const createCoupon = async (req,res) => {
    try {
        const {
            code,
            discountValue,
            minValue,
            totalUsageLimit,
            startDate,
            endDate 
        } = req.body
        
        const existingCoupon = await Coupon.findOne({ code: code, isDeleted: false });
        if(existingCoupon){
            return res.json({status:false, message: MESSAGES.ADMIN.COUPON_EXISTS });
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
        
        res.json({ status: true, message: MESSAGES.ADMIN.COUPON_CREATED });

    } catch (error) {
        res.status(500).json({ status:false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const deleteCoupon = async (req,res) => {
    try {
        const code = req.params.id

        const coupon = await Coupon.findOneAndUpdate(
            { code: code, isDeleted: false },
            { $set: { isDeleted: true } },
            { new: true }
        );

        if(!coupon){
            return res.json({ status:false, message: MESSAGES.ADMIN.COUPON_NOT_FOUND });
        }

        res.json({ status:true, message: MESSAGES.ADMIN.COUPON_DELETED });
        
    } catch (error) {
        res.status(500).json({ status:false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

module.exports = {
    getCoupon,
    createCoupon,
    deleteCoupon
}