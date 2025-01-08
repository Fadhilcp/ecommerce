const User = require('../../model/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')



const loadLogin =  (req,res) =>{

        if(req.session.admin){
            return res.redirect('/admin')
        }
        res.render('admin/login')
}

const login = async (req,res) =>{

    try {
        const {email,password} = req.body
        const admin = await User.findOne({email,isAdmin:true})

        if(admin){
            const passwordMatch = bcrypt.compare(password,admin.password)

            if(passwordMatch){
                req.session.admin = true
                return res.redirect('/admin')

            }else{
                return res.render('admin/login')
            }
        }else{
            return res.render('admin/login')
        }

    } catch (error) {
        console.error('login error',error)
        return res.redirect('/pageError')
        
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