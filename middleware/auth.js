const User = require('../model/userSchema')


const userAuth = (req, res, next) => {
     if (req.session.user) {
         return next() 
        } else {
             return res.redirect('/') 
            } 
        }


const adminAuth = async (req,res,next) =>{
   await User.findOne({isAdmin:true})
    .then(data => {
        if(data){
            next()
        }else{
            res.redirect('/admin/login')
        }
    }).catch(error =>{
        console.log('Error in admin Auth middleware')
        res.status(500).send('Internal Server error')
    })
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


module.exports = {
    userAuth,
    adminAuth,
    isBlock
}