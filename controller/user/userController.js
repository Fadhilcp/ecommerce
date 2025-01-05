const User = require('../../model/userSchema')
const otpGenerator = require('otp-generator')
const nodeMailer = require('nodemailer')
const env = require('dotenv').config()






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

       return res.render('user/login')

    } catch (error) {
        console.log('Register Page not found')
        res.status(500).send('Internal server error')
    }
}


const loadRegister = async (req,res)=>{
    try {    
        return res.render('user/register')

    } catch (error) {
        console.log('Register Page is not found')
        res.status(500).send('Internal server error')
    }
}



async function verificationEmail(email,otp){
    try {     
        const transporter = await nodeMailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:'Verify your Account',
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP:${otp}</b>`
        })
    } catch (error) {
        console.error('Error sending email',error)
        return false
    }
}


const register = async (req,res)=>{
    
    try {

        const {username,email,password} = req.body

        const findUser = await User.findOne({email})

        if(findUser){
            return res.render('user/register',{message:'User already exists'})
        }

        const otp = await otpGenerator.generate(6,{
            digits:true,
            lowerCaseAlphabets:false,
            upperCaseAlphabets:false,
            specialChars:false
        })

        
    } catch (error) {

        console.error('Error while save User'+error)
        res.status(500).send('Internal server error')
        
    }
}





module.exports = {
    loadHomePage,
    loadLogin,
    loadRegister,
    register
}