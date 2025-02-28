const User = require('../../model/userSchema')
const bcrypt = require('bcrypt')

const Order = require('../../model/orderSchema')
const Product = require('../../model/productSchema')

const PDFDocument = require('pdfkit')
const ExcelJS = require('exceljs')

const fs = require('fs')
const path = require('path')



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
        res.json({stauts:false,message:'Inernal server error'})
    }
}



const loadDashboard = async (req,res) =>{
    try {

        if(!req.session.admin){
            res.redirect('/admin/login')
        }

        let { filter, fromDate, toDate } = req.query
 

        const today = new Date()
        let startDate, endDate
        
        if (filter === "daily") {
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
        } 
        else if (filter === "weekly") {    
            const dayOfWeek = today.getDay()
            const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
            const firstDayOfWeek = new Date(today)
            firstDayOfWeek.setDate(today.getDate() - daysToSubtract)
            startDate = new Date(firstDayOfWeek.setHours(0, 0, 0, 0))
            
            const lastDayOfWeek = new Date(firstDayOfWeek)
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6)
            endDate = new Date(lastDayOfWeek.setHours(23, 59, 59, 999))
        } 
        else if (filter === "monthly") {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0)
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
        } 
        else if (filter === "yearly") {
            startDate = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0)
            endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
        } 
        else if (filter === "custom" && fromDate && toDate) {
            startDate = new Date(fromDate)
            endDate = new Date(toDate)
            endDate.setHours(23, 59, 59, 999)
        }   
        else {
            // Default to last 10 years
            startDate = new Date(today.getFullYear() - 10, 0, 1)
            endDate = new Date()
        }


        //for totalOrder and totalrevenue
        const salesData = await Order.aggregate([
            {
                $match: { createdAt: { $gte: startDate, $lte: endDate },
                status: "Delivered" 
              }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$finalPrice" }
                }
            }
        ])

        //for total products and category
        const productsData = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    uniqueCategories: { $addToSet: "$category" }
                }
            },
            {
                $project: {
                    totalProducts: 1,
                    totalCategories: { $size: "$uniqueCategories" }
                }
            }
        ])
        
        //for chart
        const salesChartData = await Order.aggregate([
            {
                $match: { createdAt: { $gte: startDate, $lte: endDate } ,
                status: "Delivered" 
              }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ])

        //top products
        const topProducts = await Order.aggregate([
            { $match: { status: "Delivered" } },
            { $unwind: "$products" }, 
            { 
                $group: {
                    _id: "$products.product", 
                    productName: { $first: "$products.productName" }, 
                    totalSales: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } },
                    productImage: {$first: '$products.productImage'}
                }
            },
            { $sort: { totalSales: -1 } }, 
            { $limit: 10 }
        ])

        //top categories
        const topCategories = await Order.aggregate([
            { $match: { status: "Delivered" } },
            { $unwind: "$products" },
            { 
                $lookup: {
                    from: "products",  
                    localField: "products.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            { 
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category", 
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" }, 
            { 
                $group: {
                    _id: {
                        categoryId: "$categoryDetails._id", 
                        categoryName: "$categoryDetails.name" 
                    }, 
                    totalSales: { $sum: "$products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } } 
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 } 
        ])

        res.render("admin/dashboard", { 
            salesData, 
            salesChartData,
            productsData,
            topProducts,
            topCategories,
            filter, 
            fromDate, 
            toDate 
        })

    } catch (error) {
        res.redirect('/admin/pageError')
    }
}



const pageError = async (req,res) => {
    res.render('admin/pageError')
}


const logout = async (req,res) => {
    try {
        
        req.session.destroy(err => {
            if(err){
                return res.redirect('/admin/pageError')
            }else{
                res.redirect('/admin/login')
            }
        })
    } catch (error) { 
        res.redirect('/admin/pageError')
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
            startDate = new Date("2000-01-01")
            endDate = new Date()
        }

        //pagination
        const totalOrders = await Order.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } })
        const totalPages = Math.ceil(totalOrders / limit)

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
                    status: { $first: "$status" }
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
        const overallOrderAmount = salesData.reduce((sum, order) => sum + (order.finalPrice - 40), 0)
        const overallDiscount = salesData.reduce((sum, order) => sum + (order.totalPrice - (order.finalPrice - 40)), 0)
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
        res.redirect('/admin/pageError')
    }
}





const downloadSalesPDF = async (req, res) => {
    try {
        let { filter, fromDate, toDate } = req.query
        let startDate, endDate
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
            startDate = new Date(today.getFullYear(), 0, 1)
            endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
        } else if (filter === "custom" && fromDate && toDate) {
            startDate = new Date(fromDate)
            endDate = new Date(toDate)
            endDate.setHours(23, 59, 59, 999)
        } else {
            startDate = new Date("2000-01-01")
            endDate = new Date()
        }


        const salesData = await Order.find({ createdAt: { $gte: startDate, $lte: endDate } })

        //summary
        const totalOrders = salesData.length
        const totalAmount = salesData.reduce((sum, order) => sum + order.totalPrice, 0)
        const totalDiscount = salesData.reduce((sum, order) => sum + (order.totalPrice - (order.finalPrice - 40)), 0)
        const finalRevenue = salesData.reduce((sum, order) => sum + (order.finalPrice - 40), 0)

        // Create PDF document
        const doc = new PDFDocument()
        const filePath = path.join(__dirname, '../../public/reports/salesReport.pdf')
        doc.pipe(fs.createWriteStream(filePath))

        // Title
        doc.font('Helvetica-Bold').fontSize(20).text('Sales Report', { align: 'center' })
        doc.moveDown(1)

        // Summary Section
        doc.fontSize(14).text(`Summary:`, { underline: true })
        doc.fontSize(12).text(`Total Orders: ${totalOrders}`)
        doc.text(`Total Sales Amount: ${totalAmount.toFixed(2)}`)
        doc.text(`Total Discount Given: ${totalDiscount.toFixed(2)}`)
        doc.text(`Final Revenue: ${finalRevenue.toFixed(2)}`)
        doc.moveDown(2)

        // Table Header Style
        const startX = 10
        const columnWidths = [100, 140, 80, 90, 120]
        let y = 220

        // Header background
        doc.rect(startX, y - 10, 590, 25).fill('#d9d9d9').stroke()
        doc.fillColor('black').fontSize(12).font('Helvetica-Bold')

        // Table Headers
        doc.text('Order ID', startX , y);
        doc.text('Customer', startX + columnWidths[0] + 30, y)
        doc.text('Status', startX + columnWidths[0] + 100, y)
        doc.text('Total Price', startX + columnWidths[0] + columnWidths[1] + 30, y)
        doc.text('Discount', startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + 30, y)
        doc.text('Final Price', startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 20, y)
        doc.text('Date', startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4], y)

        doc.moveDown(1)
        y += 25
        doc.fillColor('black').font('Helvetica')

        // Table Data 
        salesData.forEach(order => {
            doc.text(order.orderId, startX , y);
            doc.text(order.address.name.substring(0, 15), startX + columnWidths[0] + 30, y)
            doc.text(order.status, startX + columnWidths[0] + 100, y)
            doc.text(`${order.totalPrice.toFixed(2)}`, startX + columnWidths[0] + columnWidths[1] + 30, y)
            doc.text(`${(order.totalPrice - (order.finalPrice - 40)).toFixed(2)}`, startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + 30, y)
            doc.text(`${(order.finalPrice - 40).toFixed(2)}`, startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 20, y)
            doc.text(order.createdAt.toISOString().split('T')[0], startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4], y)
            
            //line each row
            doc.moveTo(startX, y + 15).lineTo(startX + 590, y + 15).stroke()
            y += 20
        })

        doc.end()


        res.download(filePath, 'salesReport.pdf')

    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server error" })
    }
}


const downloadSalesExcel = async (req, res) => {
    try {
        let { filter, fromDate, toDate } = req.query
        let startDate, endDate
        const today = new Date()

        if (filter === "daily") {
            startDate = new Date(today.setHours(0, 0, 0, 0))
            endDate = new Date(today.setHours(23, 59, 59, 999))
        } else if (filter === "weekly") {
            const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
            startDate = new Date(firstDayOfWeek.setHours(0, 0, 0, 0))
            endDate = new Date(today.setHours(23, 59, 59, 999))
        } else if (filter === "monthly") {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
        } else if (filter === "yearly") {
            startDate = new Date(today.getFullYear(), 0, 1)
            endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
        } else if (filter === "custom" && fromDate && toDate) {
            startDate = new Date(fromDate)
            endDate = new Date(toDate)
            endDate.setHours(23, 59, 59, 999)
        } else {
            startDate = new Date("2000-01-01")
            endDate = new Date()
        }

        const salesData = await Order.find({ createdAt: { $gte: startDate, $lte: endDate } })

        //summary calculation 
        const totalOrders = salesData.length
        const totalAmount = salesData.reduce((sum, order) => sum + order.totalPrice, 0)
        const totalDiscount = salesData.reduce((sum, order) => sum + (order.totalPrice - (order.finalPrice - 40)), 0)
        const finalRevenue = salesData.reduce((sum, order) => sum + (order.finalPrice - 40), 0)

        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Sales Report')

        //symmary section
        worksheet.addRow(['Summary']).font = { bold: true, underline: true }
        worksheet.addRow(['Total Orders:', totalOrders])
        worksheet.addRow(['Total Sales Amount:', totalAmount.toFixed(2)])
        worksheet.addRow(['Total Discount Given:', totalDiscount.toFixed(2)])
        worksheet.addRow(['Final Revenue:', finalRevenue.toFixed(2)])
        worksheet.addRow([])

        worksheet.addRow([
            'Order ID', 'Customer', 'Status', 'Total Amount', 'Discount', 'Final Amount', 'Date'
        ]).font = { bold: true }

        salesData.forEach((order) => {
            worksheet.addRow([
                order.orderId,
                order.address.name,
                order.status,
                order.totalPrice.toFixed(2),
                (order.totalPrice - (order.finalPrice - 40)).toFixed(2),
                (order.finalPrice - 40).toFixed(2),
                order.createdAt.toISOString().split("T")[0],
            ])
        })

        worksheet.columns = [
            { width: 20 },
            { width: 25 },
            { width: 25 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 20 },
        ]

        const filePath = path.join(__dirname, '../../public/reports/salesReport.xlsx')
        await workbook.xlsx.writeFile(filePath)
        res.download(filePath, 'salesReport.xlsx')

    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server error" })
    }
}










module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    getSalesReport,
    downloadSalesPDF,
    downloadSalesExcel
}