const User = require('../model/userSchema')


const userAuth = (req, res, next) => {
     if (req.session.user) {
         return next() 
        } else {
             return res.redirect('/') 
            } 
        }




const isBlock = async (req, res, next) => {
    
    if (req.session.user) { 
        try { 
            const user = await User.findById(req.session.user)
             if (!user.isBlocked) { 
                next() 
            } else {
                return res.redirect('/') 
                }
            } catch (error) {
                 console.error('isBlock middleware error', error)
                res.status(500).json('Internal server error') 
            } 
        } else {
            next()
        }
    }




const adminAuth = async (req,res,next) => {
    try {

        if(req.session?.admin){
            next()
        }else{
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.error('adminAuth middleware error',error)
        res.status(500).json('Internal server error')
    }
}





module.exports = {
    userAuth,
    adminAuth,
    isBlock
}