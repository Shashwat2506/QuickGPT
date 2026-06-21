import jwt from 'jsonwebtoken'
import User from '../models/User.js';


export const protect = async (req, res, next) => {
    let token = req.headers.authorization;
        console.log("TOKEN RECEIVED:", token);
        console.log("JWT_SECRET:", process.env.JWT_SECRET);



    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const userId = decoded.id;

        const user= await User.findById(userId)

                if(!user) {
        return res.json({ success: false, message: "Not authorized, user not found" });
            }
           
            req.user= user;
        next()

} catch (error) {
    console.log("JWT ERROR:", error.message);
    res.status(401).json({
        message: "Not authorized, token failed"
    });
}
}