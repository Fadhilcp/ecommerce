

const routeHandling = (req,res,next) => {
    return res.status(404).redirect('/pageError')
}


module.exports = {
    routeHandling
}