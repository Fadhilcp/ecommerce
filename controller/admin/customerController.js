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

        const limit = 10

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

        res.json({status:true,message:'User blocked successfully'})
    } catch (error) {
        console.error('user block error',error)
        res.status(500).json({status:false,message:'Erro while blocking user'})
    }
}



const customerunBlocked = async (req,res) => {
    try {
        
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})

        res.json({status:true,message:'User unblock successfully'})
    } catch (error) {
        res.status(500).json({status:false,message:'Erro while unblocking user'})
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked
}