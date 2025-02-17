const User = require('../../model/userSchema')






const customerInfo = async (req,res) => {
    try {

        let search = ''
        if(req.query.search){
            search = req.query.search
        }
        let page = 1
        if(req.query.page){
            page = req.query.page
        }

        const limit = 5

        const userData = await User.find({
            isAdmin:false,
            $or:[
                {username:{$regex:'.*'+search+'.*'}},
                {email:{$regex:'.*'+search+'.*'}}
            ]
        })


        .limit(limit*1)
        .skip((page-1)*limit)
        .exec()

        const count = await User.find({
            isAdmin:false,
            $or:[
                {username:{$regex:'.*'+search+'.*'}},
                {email:{$regex:'.*'+search+'.*'}}
            ]
        }).countDocuments()

        res.render('admin/customers',{
            data:userData
            ,currentPage:page,
            totalPages:Math.ceil(count/limit)
        })

    } catch (error) {
        console.error('error',error)
    }
}



const customerBlocked = async (req,res) =>{
    try {
         
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})

        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageError')
    }
}



const customerunBlocked = async (req,res) => {
    try {
        
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})

        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageError')
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked
}