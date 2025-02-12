


const getCoupon = async (req,res) => {
    try {

        res.render('admin/coupon')
        
    } catch (error) {
        console.error('coupon page Error',error)
        res.redirect('/admin/pageError')
    }
}


module.exports = {
    getCoupon
}