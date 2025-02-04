

const routeHandling = (req,res,next) => {

    const requestedRoute = req.originalUrl || req.url || '[Unknown Route]'
    console.warn(`Invalid route accessed: ${requestedRoute}`)
    return res.status(404).redirect('/pageError')
}


module.exports = {
    routeHandling
}