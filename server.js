const express = require('express')
const app = express()

const env = require('dotenv').config()
const path = require('path')

const session = require('express-session')
const nocache = require('nocache')
const db = require('./config/db')
const passport = require('./config/passport')

const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')

const errorHandling = require('./middleware/errorHandleMiddleware')

db()
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge: 72*60*60*1000
    }
})) 


app.use(passport.initialize())
app.use(passport.session())

app.use(nocache())

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

app.use(express.static(path.join(__dirname,'public')))


app.use('/',userRouter)
app.use('/admin',adminRouter)

app.use(errorHandling.routeHandling)





app.listen(process.env.PORT,()=>{
    console.log('server running at http://localhost:3000')
})