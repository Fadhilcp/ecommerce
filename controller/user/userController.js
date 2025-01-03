


const loadHomePage = async (req,res)=>{
    try {
        
        res.render('user/home.ejs')
    } catch (error) {

        console.log('Home Page not found')
        res.status(500).send('Server error')
    }
}






module.exports = {
    loadHomePage
}