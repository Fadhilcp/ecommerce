const Address = require('../../model/addressSchema')
const User = require('../../model/userSchema')
const Order = require('../../model/orderSchema')
const Wallet = require('../../model/walletSchema')
const bcrypt = require('bcrypt')
const nodeMailer = require('nodemailer')
const env = require('dotenv').config()
const otpGenerator = require('otp-generator')
const moment = require('moment')


async function verificationEmail(email, otp) {
    try {
        const transporter = await nodeMailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'OTP for reset Password',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        })

        return info.accepted.length > 0

    } catch (error) {
        console.error('Error sending email:', error.message);
        return false;
    }
}



function verificationOtp() {
    const otp = otpGenerator.generate(6, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false
    })
    return otp
}


async function securePassword(password) {
    try {

        const passwordHash = await bcrypt.hash(password, 10)

        return passwordHash

    } catch (error) {
        console.error('Hash password', error)
        res.status(500).json('Server internal error')
    }
}


const account = async (req, res) => {
    try {

        const user = req.session.user

        const userData = await User.findById(user)

        res.render('user/account', {
            user: userData,
            username: userData.username,
            email: userData.email,
            active: 'account'
        })

    } catch (error) {
        console.log('account page error:', error)
        res.status(500).json('internal server error')

    }
}


const getChangePassword = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findById(user)

        if(userData.googleId){
            return res.redirect('/account')
        }
        res.render('user/changePassword', { user: userData, active: 'account' })
    } catch (error) {
        console.error('change password page error', error)
        res.status(500).json('internal server error')
    }
}


const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body
        const userId = req.session.user

        const user = await User.findById(userId)

        const passwordMatch = await bcrypt.compare(currentPassword, user.password)

        if (!passwordMatch) {
            return res.json({ status: false, message: 'Current Password is not match' })
        }

        if (newPassword != confirmPassword) {
            return res.json({ status: false, message: 'Confirm Password is not match' })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        user.password = hashedPassword
        await user.save()

        return res.json({ status: true, message: 'Password changed successfully' })

    } catch (error) {
        console.error('error while changing password', error)
        res.status(500).json({ status: false, message: 'Internal server error' })
    }
}


const getAddress = async (req, res) => {
    try {

        const userId = req.session.user

        const userData = await User.findById(userId)
        const addressData = await Address.findOne({ userId: userId })

        res.render('user/myAddress', { user: userData, userAddress: addressData, active: 'account' })

    } catch (error) {
        console.error('Address page Error', error)
        res.redirect('/pageError')
    }
}


const getCreateAddress = async (req, res) => {
    try {

        const user = req.session.user

        const userData = await User.findById(user)

        res.render('user/createAddress', { user: userData, active: 'account' })
    } catch (error) {
        console.error('create address page error', error)
        res.redirect('/pageError')
    }
}


const createAddress = async (req, res) => {
    try {

        const userId = req.session.user

        const userData = await User.findOne({ _id: userId })

        const { houseNo, street, city, state, phone, pincode } = req.body

        const userAddress = await Address.findOne({ userId: userData._id })

        if (!userAddress) {
            const newAddress = new Address({
                userId: userData._id,
                address: [{ houseNo, street, city, state, phone, pincode }]
            })

            await newAddress.save()
        } else {
            userAddress.address.push({ houseNo, street, city, state, phone, pincode })
            await userAddress.save()
        }

        return res.json({ status: true, redirectUrl: '/address' })

    } catch (error) {
        console.error('address creating error', error)
        res.json({ status: false, redirectUrl: '/pageError' })
    }
}



const getEditAddress = async (req, res) => {
    try {

        const addressId = req.query.id
        const userId = req.session.user

        const userData = await User.findById(userId)

        const currentAddress = await Address.findOne({
            'address._id': addressId
        })

        if (!currentAddress) {
            return res.redirect('/pageError')
        }

        const addressData = currentAddress.address.find((item) => {
            return item._id.toString() === addressId.toString()
        })

        if (!addressData) {
            return res.redirect('/pageError')
        }

        res.render('user/editAddress', { address: addressData, user: userData, active: 'account' })

    } catch (error) {
        console.error('edit address page error', error)
        res.redirect('/pageError')
    }
}


const editAddress = async (req, res) => {
    try {

        const { houseNo, street, city, state, phone, pincode } = req.body

        const addressId = req.query.id
        const userId = req.session.user

        const findAddress = await Address.findOne({ 'address._id': addressId })

        if (!findAddress) {
            return res.json({ status: false, redirectUrl: '/pageError' })
        }

        await Address.updateOne(
            { 'address._id': addressId },
            {
                $set: {
                    'address.$': {
                        _id: addressId,
                        houseNo: houseNo,
                        street: street,
                        city: city,
                        state: state,
                        phone: phone,
                        pincode: pincode
                    }
                }
            }
        )

        res.json({ status: true, redirectUrl: '/address' })

    } catch (error) {
        console.error('edit address error', error)
        res.json({ status: false, redirectUrl: '/pageError' })
    }
}


const deleteAddress = async (req, res) => {
    try {

        const addressId = req.query.id

        const findAddress = await Address.findOne({ 'address._id': addressId })

        if (!findAddress) {
            return res.json({ status: false, message: 'Address not found' })
        }

        await Address.updateOne({ 'address._id': addressId },
            {
                $pull: { address: { _id: addressId } }
            })

        res.json({ status: true })

    } catch (error) {
        console.error('delete address error', error)
        res.json({ status: false, message: 'Internal server issue' })
    }
}


const getForgotPassword = async (req, res) => {
    try {

        const userId = req.session.user
        const userData = await User.findById(userId)

        res.render('user/forgotPassword', { 
            active:'login',
            user:userData
        })
    } catch (error) {
        console.error('forgot password page error',error)
        res.redirect('/pageError')
    }
}


const forgotPasswordEmail = async (req, res) => {
    try {
        const { email } = req.body
        const findUser = await User.findOne({ email: email })


        if (findUser) {
            const otp = verificationOtp()
            const emailSent = verificationEmail(email, otp)

            if (emailSent) {
                console.log('forgot pass Otp', otp)
                req.session.userOtp = otp
                req.session.email = email
                return res.render('user/forgotPasswordOtp',{
                    active:'login',
                    user:'user'
                })
            } else {
                return res.render('user/forgotPassword', { message: 'Failed to sent OTP,Please try again' })
            }

        } else {
            return res.render('user/forgotPassword', { message: 'User with this email does not exist' })
        }
    } catch (error) {
        console.error('forgot password email page error', error)
        res.json({ status: false, message: 'Internal server issue' })
    }
}



const passwordOtp = async (req, res) => {
    try {

        const { otp } = req.body

        if (otp === req.session.userOtp) {
            req.session.isOtpVerified = true

            return res.json({ status: true, redirectUrl: '/resetPassword' })
        } else {
            return res.json({ status: false, message: 'OTP is not matching' })
        }

    } catch (error) {
        res.status(500).json({ status: false, message: 'An error occured,Please try again' })
    }
}


const getResetPassword = async (req, res) => {
    try {
        if (req.session.isOtpVerified) {

            delete req.session.isOtpVerified

            return res.render('user/resetPassword',{active:'login'})
        } else {
            return res.redirect('/login')
        }

    } catch (error) {
        console.error('reset password page error')
        res.redirect('/pageError')
    }
}


const resendOtp = async (req, res) => {
    try {

        const otp = verificationOtp()
        req.session.userOtp = otp
        const email = req.session.email

        const emailSent = await verificationEmail(email, otp)

        if (emailSent) {
            console.log('Resent password OTP', otp)
            return res.json({ status: true, message: 'OTP resend Successfully' })
        } else {
            res.json({ status: false, message: 'resend OTP error' })
        }


    } catch (error) {
        console.error('Otp resend error', error)
        res.json({ status: false, message: 'Internal server error' })
    }
}


const newPassword = async (req, res) => {
    try {

        const { newPassword, confirmPassword } = req.body

        const email = req.session.email

        if (newPassword === confirmPassword) {
            const passwordHash = await securePassword(newPassword)

            await User.updateOne({ email: email },
                { $set: { password: passwordHash } }
            )

            return res.redirect('/login')
        } else {
            res.render('user/resetPassword')
        }

    } catch (error) {
        console.error('Password saving error', error)
        res.redirect('/pageError')
    }
}





const getOrders = async(req,res) => {
    try {

        const page = parseInt(req.query.page) || 1
        const limit = 5
        const skip = (page - 1)*limit

        const userId = req.session.user
        const userData = await User.findById(userId)
        const orderData = await Order.find({userId:userId})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        orderData.forEach((order) => {
            order.date = moment(order.createdAt).format('DD/MM/YYYY')
        })

        const totalOrders = await Order.countDocuments({userId})
        const totalPages = Math.ceil(totalOrders / limit)

        res.render('user/orders',{
            user:userData,
            totalPages:totalPages,
            currentPage:page,
            active:'account',
            orders:orderData
        })
        
    } catch (error) {
        console.error('orders page error',error)
        res.redirect('pageError')
    }
}



const getOrderDetail = async (req,res) => {
    try {

        const userId = req.session.user
        const userData = await User.findById(userId)

        const orderId = req.params.id

        const orderData = await Order.findById(orderId)

        orderData.date = moment(orderData.createdAt).format('MMMM Do YYYY, h:mm:ss A')

       
        

        return res.render('user/orderDetails',{
            order:orderData, 
            user:userData,
            active:'account'
        })
        
    } catch (error) {
        console.error('order detail page Error',error)
        res.redirect('/pageError')
    }
}




const getWallet = async (req,res) => {
    try {

        const userId = req.session.user
        const userData = await User.findById(userId)

        let wallet = await Wallet.findOne({userId:userId})

        if(!wallet){
            wallet = new Wallet({userId,transaction:[]})
        }

        wallet.transaction.forEach((item) => {
            item.Date = moment(item.date).format('MMMM Do YYYY, h:mm:ss A')
        })

        wallet.update = moment(wallet.updatedAt).format('MMMM Do YYYY, h:mm:ss A')

        console.log('this wallet',wallet)

        res.render('user/wallet',{
            user:userData,
            active:'account',
            wallet:wallet
        })
        
    } catch (error) {
        console.error('Wallet page Error',error)
        res.redirect('/pageError')
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
    deleteAddress,
    getForgotPassword,
    forgotPasswordEmail,
    passwordOtp,
    getResetPassword,
    resendOtp,
    newPassword,
    getOrders,
    getOrderDetail,
    getWallet
}