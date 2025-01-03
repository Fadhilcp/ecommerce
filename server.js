const express = require('express')
const app = express()

const env = require('dotenv').config()
const path = require('path')

const db = require('./config/db')

const userRouter = require('./routes/userRouter')

db()


app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

app.use(express.static(path.join(__dirname,'public')))


app.use('/',userRouter)






app.listen(process.env.PORT,()=>{
    console.log('server is running')
})