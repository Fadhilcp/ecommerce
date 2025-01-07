const User = require('../../model/userSchema')
const otpGenerator = require('otp-generator')
const nodeMailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')


const pageNotFound = async (req,res)=>{
    try {
        res.render('user/page404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}



const loadHomePage = async (req,res)=>{
    try {
        
       return res.render('user/home')
    } catch (error) {

        console.log('Home Page not found')
        res.status(500).send('Internal server error')
    }
}



const loadLogin = async (req,res)=>{
    try {

    if(!req.session.user){
        return res.render('user/login',{message:''})
    }else{
        res.redirect('/')
    }


    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const login = async (req,res) =>{

    try {
        
        const {email,password} = req.body
        const findUser = await User.findOne({isAdmin:false,email:email})
 
        if(!findUser){
            return res.render('user/login',{message:'User not found'})
        }
        if(findUser.isBlocked){
            return res.render('user/login',{message:'User is Blocked by Admin'})
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password)

        if(!passwordMatch){
            return res.render('user/login',{message:'Incorrect password'})
        }

        req.session.user = findUser._id
        res.redirect('/')


    } catch (error) {

        console.error('Login error',error)
        res.render('login',{message:'Login failed,Please try again'})
        
    }
}


const loadRegister = async (req,res)=>{
    try {    
        return res.render('user/register',{message:''})

    } catch (error) {
        console.log('Register Page is not found')
        res.status(500).send('Internal server error')
    }
}



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
            subject: 'Verify your Account',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        })

        return info.accepted.length > 0

    } catch (error) {
        console.error('Error sending email:', error.message);
        return false;
    }
}



function verificationOtp(){ 
    const otp = otpGenerator.generate(6,{
                digits:true,
                lowerCaseAlphabets:false,
                 upperCaseAlphabets:false,
                specialChars:false
})
     return otp
}

const register = async (req,res)=>{
    try {
        const {username,email,password} = req.body
        const findUser = await User.findOne({email})

        if(findUser){
            return res.render('user/register',{message:'User already exists'})
        }

        const otp = await verificationOtp()
        const emailSent = await verificationEmail(email,otp) 

        if(!emailSent){
            return res.json('Email-error')
        }
        req.session.userOtp = otp
        req.session.userData = {username,email,password}
        console.log(otp)

        res.render('user/verifyOtp') 
        
    } catch (error) {

        console.error('signUp'+error)
        res.redirect('/pageNotFound')
        
    }
}


async function securePassword(password){
    try {

        const  passwordHash = await bcrypt.hash(password,10) 

        return passwordHash 
        
    } catch (error) {
        console.error('Hash password',error)
        res.status(500).json('Server internal error')
    }
}

const verifyOtp = async (req,res)=>{

    try {

        const {otp} = req.body
   
        if(otp === req.session.userOtp){
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)

            const saveUserData = new User({
                username:user.username,
                email:user.email,
                password:passwordHash
            })
    
            await saveUserData.save()
            req.session.user = saveUserData._id
            res.json({success:true ,redirectUrl:'/'})

        }else{
            res.status(400).json({success:false,message:'invalid OTP,Please try again'})
        }
        
    } catch (error) {
        console.error('Error in verifying OTP',error)
        res.status(500).json({success:false , message:'An error Occured'})
    }
}


const resendOtp = async (req,res)=>{
    try {
        
        const {email} = req.session.userData

        if(!email){
            return res.status(500).json({success:false, message:'Email not found in Session'})
        }

        const otp = await verificationOtp()

        req.session.userOtp = otp
        const emailSent = await verificationEmail(email,otp)

        if(emailSent){
            console.log('Resend OTP',otp)
            res.status(200).json({success:true,message:'OTP Resend Successfully'})
        }else{
            res.status(500).json({success:false,message:'Failed to Resend OTP,Please try again'})
        }
    } catch (error) {

        console.error('Error resending OTP',error)
        res.status(500).json({success:false,message:'Internal server error,Please try again'})
        
    }
}

const account = async (req,res) =>{
    try {
        
        res.render('user/account')

    } catch (error) {
        console.log('account page error:',error)
        res.status(500).json('internal server error')
        
    }
}


const logout = async(req,res) => {
    try {

        console.log('session',req.session)

        req.session.destroy((err)=>{
            if(err){
                console.log('Session Destruction error',err.messsage)
                return res.redirect('/pageNotFound')
            }else{
                return res.redirect('/login')
            }
        })
        
    } catch (error) {
        console.log('Logout error',error)
        res.redirect('/pageNotFound')
    }
}








module.exports = {
    loadHomePage,
    loadLogin,
    login,
    loadRegister,
    register,
    verifyOtp,
    resendOtp,
    pageNotFound,
    account,
    logout
}