const User = require('../../model/userSchema')
const bcrypt = require('bcrypt')



const account = async (req,res) =>{
    try {

        const user = req.session.user

        const userData = await User.findById(user)
        
        res.render('user/account',{
            username:userData.username,
            email:userData.email
        })

    } catch (error) {
        console.log('account page error:',error)
        res.status(500).json('internal server error')
        
    }
}


const getChangePassword = async (req,res)=>{
    try {
        
      res.render('user/changePassword')  
    } catch (error) {
        console.error('change password page error',error)
        res.status(500).json('internal server error')
    }
}


const changePassword = async(req,res)=>{
    try {
        const {currentPassword,newPassword,confirmPassword} = req.body
        const userId = req.session.user

        const user = await User.findById(userId)

        const passwordMatch = await bcrypt.compare(currentPassword,user.password)

        if(!passwordMatch){
            return res.json({status:false,message:'Current Password is not match'})
        }

        if(newPassword != confirmPassword){
            return res.json({status:false,message:'Confirm Password is not match'})
        }

        const hashedPassword = await bcrypt.hash(newPassword,10)

        user.password = hashedPassword
        await user.save()

        return res.json({status:true,message:'Password changed successfully'})

    } catch (error) {
        console.error('error while changing password',error)
        res.status(500).json({status:false,message:'Internal server error'})
    }
}


module.exports = {
    account,
    getChangePassword,
    changePassword
}