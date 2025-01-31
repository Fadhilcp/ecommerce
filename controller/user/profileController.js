const Address = require('../../model/addressSchema')
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


const getAddress = async (req,res) => {
    try {

        const userId = req.session.user

        const userData = await User.findById(userId)
        const addressData = await Address.findOne({userId:userId})

        res.render('user/myAddress',{user:userData,userAddress:addressData})
        
    } catch (error) {
        console.error('Address page Error',error)
        res.redirect('/pageError')
    }
}


const getCreateAddress = async (req,res) => {
    try {
        
        const user = req.session.user

        res.render('user/createAddress',{user:user})
    } catch (error) {
        console.error('create address page error',error)
        res.redirect('/pageError')
    }
}


const createAddress = async (req,res) => {
    try {
        
        const userId = req.session.user

        const userData = await User.findOne({_id:userId})

        const {houseNo,street,city,country,phone,pincode} = req.body

        const userAddress = await Address.findOne({userId:userData._id})

        if(!userAddress){
            const newAddress = new Address({
                userId:userData._id,
                address:[{houseNo,street,city,country,phone,pincode}]
            })

            await newAddress.save()
        }else{
            userAddress.address.push({houseNo,street,city,country,phone,pincode})
            await userAddress.save()
        }

        return res.json({status:true,redirectUrl:'/address'})

    } catch (error) {
        console.error('address creating error',error)
        res.json({status:false,redirectUrl:'/pageError'})
    }
}



const getEditAddress = async (req,res) => {
    try {

        const addressId = req.query.id
        const userId = req.session.user

        const currentAddress = await Address.findOne({
            'address._id':addressId
        })

        if(!currentAddress){
            return res.redirect('/pageError')
        }

        const addressData = currentAddress.address.find((item)=>{
           return item._id.toString() === addressId.toString()
        })

        if(!addressData){
            return res.redirect('/pageError')
        }

        res.render('user/editAddress',{address:addressData, user:userId})
        
    } catch (error) {
        console.error('edit address page error',error)
        res.redirect('/pageError')
    }
}


const editAddress = async (req,res) => {
    try {
        
        const {houseNo,street,city,country,phone,pincode} = req.body

        const addressId = req.query.id
        const userId = req.session.user

        const findAddress = await Address.findOne({'address._id':addressId})

        if(!findAddress){
            return res.json({status:false,redirectUrl:'/pageError'})
        }

        await Address.updateOne(
            {'address._id':addressId},
            {$set : {
                'address.$':{
                    _id:addressId,
                    houseNo:houseNo,
                    street:street,
                    city:city,
                    country:country,
                    phone:phone,
                    pincode:pincode
                }
            }}
        )

        res.json({status:true,redirectUrl:'/address'})

    } catch (error) {
        console.error('edit address error',error)
        res.json({status:false,redirectUrl:'/pageError'})
    }
}


const deleteAddress = async(req,res) => {
    try {
        
        const addressId = req.query.id

        const findAddress = await Address.findOne({'address._id':addressId})

        if(!findAddress){
            return res.json({status:false,message:'Address not found'})
        }

        await Address.updateOne({'address._id':addressId},
        {$pull:{address:{_id:addressId}}
    })

    res.json({status:true})

    } catch (error) {
        console.error('delete address error',error)
        res.json({status:false,message:'Internal server issue'})
    }
}

module.exports = {
    account,
    getChangePassword,
    changePassword,
    getAddress,
    getCreateAddress,
    createAddress,
    getEditAddress,
    editAddress,
    deleteAddress
}