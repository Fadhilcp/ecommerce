const User = require('../../model/userSchema')


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


const register = async (req,res)=>{
    const {username,email,password} = req.body
    try {

        const newUser = new User({username,email,password})

        console.log(newUser)

        await newUser.save()

        res.redirect('/register')
        
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