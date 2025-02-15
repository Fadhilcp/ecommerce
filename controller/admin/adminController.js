const User = require('../../model/userSchema')
const bcrypt = require('bcrypt')

const Order = require('../../model/orderSchema')



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

        if(!req.session.admin){
            res.redirect('/login')
        }

        res.render('admin/dashboard')

    } catch (error) {
        console.error('Dashboard error',error)
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
        console.error('unexpected error during logout',error)    
        res.redirect('/pageError')
    }
}





const getSalesReport = async (req, res) => {
    try {
        let { filter, fromDate, toDate } = req.query

        const page = parseInt(req.query.page) || 1
        const limit = 10

        let startDate
        let endDate

        const today = new Date()
        
        if (filter === "daily") {

            startDate = new Date(today.setHours(0, 0, 0, 0))
            endDate = new Date(today.setHours(23, 59, 59, 999))

        } else if (filter === "weekly") {

            const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
            startDate = new Date(firstDayOfWeek.setHours(0, 0, 0, 0))
            endDate = new Date(today.setHours(23, 59, 59, 999))

        } else if (filter === "monthly") {

            startDate = new Date(today.getFullYear(), today.getMonth(), 1)
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

        } else if (filter === "yearly") {

            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)

        } else if (filter === "custom" && fromDate && toDate) {

            startDate = new Date(fromDate);
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999)

        } else {
            startDate = new Date("2000-01-01");
            endDate = new Date();
        }

        //pagination
        const totalOrders = await Order.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } })
        const totalPages = Math.ceil(totalOrders / limit)

        console.log('date filter',startDate,'end',endDate)

        //order list
        const salesData = await Order.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: startDate, $lte: endDate } 
                } 
            },
            { 
                $unwind: "$products"
            },
            { 
                $group: {
                    _id: "$orderId",
                    orderId: { $first: "$orderId" },
                    customerName: { $first: "$address.name" },
                    totalProductsSold: { $sum: "$products.quantity" }, 
                    totalPrice: { $first: "$totalPrice" },
                    finalPrice: { $first: "$finalPrice" }, 
                    createdAt: { $first: "$createdAt" }, 
                } 
            },
            {
                $addFields: {
                    discount: { $subtract: ["$totalPrice", "$finalPrice"] }
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ])


        const overallSalesCount = salesData.length
        const overallOrderAmount = salesData.reduce((sum, order) => sum + order.finalPrice, 0)
        const overallDiscount = salesData.reduce((sum, order) => sum + (order.totalPrice - order.finalPrice), 0)
        const customersCount = new Set(salesData.map(order => order.customerName)).size


        res.render('admin/salesReport', { 
            salesData, 
            filter, 
            fromDate, 
            toDate,
            overallSalesCount,
            overallOrderAmount,
            overallDiscount,
            customersCount,
            currentPage : page,
            totalPages
        })

    } catch (error) {
        console.error('Error fetching sales report:', error)
        res.status(500).send("Internal Server Error")
    }
};






module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    getSalesReport
}