const User = require('../../model/userSchema')
const Product = require('../../model/productSchema')
const Category = require('../../model/categorySchema')
const otpGenerator = require('otp-generator')
const nodeMailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')



const pageError = (req,res) => {
    res.render('user/page404')
}



const loadHomePage = async (req,res)=>{
    try {
        const user = req.session.user

        const categories = await Category.find({isListed:true})
        let productData = await Product.find(
            {isBlocked:false,
                category:{$in:categories.map(category => category._id)},
                quantity:{$gt:0}}
        )

        productData.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))
        productData = productData.slice(0,8)

        if(user){
            const userData = await User.findOne({_id:user})
            return res.render('user/home',{user:userData,products:productData,active:'home'})
        }else{
            return res.render('user/home',{products:productData,active:'home'})
        }
    } catch (error) {
        res.redirect('/pageError')
    }
}



const getShop = async (req,res) => {
    try {

        const user = req.session.user
        const categories = await Category.find({isListed:true})
        const categoryIds = categories.map((category)=> category._id.toString())
        
        const page = parseInt(req.query.page) || 1
        const limit = 12
        const skip = (page - 1) * limit


        //filter Object
        let filterCondition = {
            isBlocked: false,
            category: { $in: categoryIds }
        }

        
        if (req.query.category) {
            const selectedCategory = await Category.findOne({ name: req.query.category, isListed: true })
            if (selectedCategory) {
                filterCondition.category = selectedCategory._id
            }
        }

        if (req.query.ml) {
            filterCondition.capacity = req.query.ml
        }

        const searchQuery = req.query.search || ""

        //search query
        if (req.query.search) {
            filterCondition.productName = { $regex: searchQuery , $options: "i" }
        }

        let sortOption = {}
        
        //sort
        if (req.query.sort) {

            filterCondition.quantity = { $gt: 0 }

            switch (req.query.sort) {
                case "name-asc":
                    sortOption = { productName: 1 } 
                    break
                case "name-desc":
                    sortOption = { productName: -1 } 
                    break
                case "price-asc":
                    sortOption = { offerPrice: 1 } 
                    break
                case "price-desc":
                    sortOption = { offerPrice: -1 } 
                    break
                case "new-arrivals":
                    sortOption = { createdAt: -1 } 
            }
        }

        let products = await Product.find(filterCondition)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)

        let totalProducts = await Product.countDocuments(filterCondition)

        const totalPages = Math.ceil(totalProducts/limit)
        const categoriesWithIds = categories.map((category)=>({_id:category._id,name:category.name}))

        const renderData = {
            products: products,
            category: categoriesWithIds,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            active: 'shop',
            sort: req.query.sort || "",
            selectedCategory: req.query.category || "",
            selectedMl: req.query.ml || "",
            search: searchQuery
        }
        
        if (user) {
            const userData = await User.findOne({ _id: user })
            renderData.user = userData
        }
        
        res.render('user/shop', renderData)

    } catch (error) {
        res.redirect('/pageError')
    }
}



const loadLogin = async (req,res)=>{
    try {

    if(!req.session.user){
        return res.render('user/login',{message:'',active:'login'})
    }else{
        res.redirect('/')
    }

    } catch (error) {
        res.redirect('/pageError')
    }
}







const login = async (req,res) =>{
    try {
        
        const {email,password} = req.body
        
        const findUser = await User.findOne({isAdmin:false,email:email})

        if(!findUser){
            return res.json({status:false,message:'User not found'})
        }
        if(findUser.isBlocked){
            return res.json({status:false,message:'User isBlocked by Admin'})
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password)

        if(!passwordMatch){
            return res.json({status:false,message:'Password is not match'})
        }

        req.session.user = findUser._id
        return res.json({status:true,redirectUrl:'/'})


    } catch (error) {
        res.status(500).json({status:false,message:'User not found'})
    }
}


const loadRegister = async (req,res)=>{
    try {    
        return res.render('user/register',{message:'',active:'login'})

    } catch (error) {
        res.redirect('/pageError')
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
        return false
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
            return res.json('user/register',{message:'User already exists'})
        }

        const otp = await verificationOtp()
        const emailSent = await verificationEmail(email,otp)

        if(!emailSent){
            return res.json('user/register',{message:'Email didnt sent'})
        }
        req.session.userOtp = otp
        req.session.userData = {username,email,password}
        console.log(otp)
        return res.render('user/verifyOtp', { message: 'OTP sent successfully. Please check your email.',active:'login'})
        
    } catch (error) {
        res.redirect('/pageError')
    }
}


async function securePassword(password){
    try {

        const  passwordHash = await bcrypt.hash(password,10) 

        return passwordHash 
        
    } catch (error) {
        throw new Error("Password hashing failed")
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
        res.status(500).json({success:false,message:'Internal server error,Please try again'})
    }
}


const passportToUser = (req,res) => {
    try {
        if(req.user){
            req.session.user = req.session.passport.user
            delete req.session.passport
        }
        res.redirect('/')
        
    } catch (error) {
         res.redirect('/pageError')
    }
}


const logout = async(req,res) => {
    try {
        req.session.destroy((err)=>{
            if(err){
                console.error('Session Destruction error',err.messsage)
                return res.redirect('/pageNotFound')
            }else{
                return res.redirect('/login')
            }
        })
        
    } catch (error) {
        res.redirect('/pageError')
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
    getShop,
    passportToUser,
    logout,
    pageError
}