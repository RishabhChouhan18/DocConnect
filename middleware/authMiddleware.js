module.exports = function (req, res, next) {
    if (!req.session.user) {
        return res.redirect("/auth/login");  // yaha login ka correct route
    }
    next();
};
