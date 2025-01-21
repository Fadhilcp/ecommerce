const User = require('../../model/userSchema')
const bcrypt = require('bcrypt')



const loadLogin =  (req,res) =>{

        if(req.session.admin){
            return res.redirect('/admin')
        }
        res.render('admin/login',{message:''})
}

const login = async (req,res) =>{

    try {
        const {email,password} = req.body
        const admin = await User.findOne({email,isAdmin:true})

        if(admin){
            const passwordMatch = await bcrypt.compare(password,admin.password)

            if(passwordMatch){
                req.session.admin = true
              return res.json({status:true,redirectUrl:'/admin'})

            }else{
                return res.json({status:false,message:'Invalid Password'})
            }
        }else{
            return res.json({status:false,message:'Admin not found'})
        }

    } catch (error) {
        console.error('login error',error)
        res.json({stauts:false,redirectUrl:'/admin/pageError'})
        
    }
}



const loadDashboard = async (req,res) =>{
    try {
        if(req.session.admin){
            res.render('admin/dashboard')
        }
    } catch (error) {
        console.log('Dashboard error',error)
        res.redirect('/pageError')
    }
}



const pageError = async (req,res) => {
    res.render('admin/pageError')
}


const logout = async (req,res) => {
    try {
        
        req.session.destroy(err => {
            if(err){
                console.log('Error destroying Session')
                return res.redirect('/pageError')
            }else{
                res.redirect('/admin/login')
            }
        })
    } catch (error) {
        console.log('unexpected error during logout',error)    
        res.redirect('/pageError')
    }
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout
}