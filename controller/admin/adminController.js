const User = require('../../model/userSchema')
const bcrypt = require('bcrypt')

const Order = require('../../model/orderSchema')

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

        // Create PDF document
        const doc = new PDFDocument()
        const filePath = path.join(__dirname, '../../public/reports/salesReport.pdf')
        doc.pipe(fs.createWriteStream(filePath))

        // Title
        doc.font('Helvetica-Bold').fontSize(20).text('Sales Report', { align: 'center' })
        doc.moveDown(1)

        // Table Header Style
        const startX = 10;
        const columnWidths = [100, 140, 80, 90, 120]
        let y = 120

        // Header background
        doc.rect(startX, y - 10, 590, 25).fill('#d9d9d9').stroke();
        doc.fillColor('black').fontSize(12).font('Helvetica-Bold');

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
            doc.text(`$${order.totalPrice.toFixed(2)}`, startX + columnWidths[0] + columnWidths[1] + 30, y)
            doc.text(`$${(order.totalPrice - order.finalPrice).toFixed(2)}`, startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + 30, y)
            doc.text(`$${order.finalPrice.toFixed(2)}`, startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + 20, y)
            doc.text(order.createdAt.toISOString().split('T')[0], startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4], y)
            
            //line each row
            doc.moveTo(startX, y + 15).lineTo(startX + 590, y + 15).stroke()
            y += 20
        })

        doc.end()


        res.download(filePath, 'salesReport.pdf')

    } catch (error) {
        console.error('Error generating PDF:', error)
        res.status(500).send("Internal Server Error")
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

        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Sales Report')

        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'Status', key: 'status', width: 25 },
            { header: 'Total Amount', key: 'totalPrice', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Final Amount', key: 'finalPrice', width: 15 },
            { header: 'Date', key: 'createdAt', width: 20 }
        ]

        salesData.forEach(order => {
            worksheet.addRow({
                orderId: order.orderId,
                customer: order.address.name,
                status: order.status,
                totalPrice: `$${order.totalPrice.toFixed(2)}`,
                discount: `$${(order.totalPrice - order.finalPrice).toFixed(2)}`,
                finalPrice: `$${order.finalPrice.toFixed(2)}`,
                createdAt: order.createdAt.toISOString().split('T')[0]
            })
        })

        const filePath = path.join(__dirname, '../../public/reports/salesReport.xlsx')
        await workbook.xlsx.writeFile(filePath)
        res.download(filePath, 'salesReport.xlsx')

    } catch (error) {
        console.error('Error generating Excel:', error)
        res.status(500).send("Internal Server Error")
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