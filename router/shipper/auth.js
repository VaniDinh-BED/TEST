import express from 'express'
import argon2 from "argon2"
import jwt from "jsonwebtoken"
import { sendError, sendServerError, sendSuccess } from '../../helper/client.js'
import Staff from '../../model/Staff.js'
import User from '../../model/User.js'
import PostOffice from '../../model/PostOffice.js'
import { JWT_EXPIRED, JWT_REFRESH_EXPIRED } from '../../constant.js'
import { TOKEN_LIST, TOKEN_BLACKLIST } from '../../index.js'
const authShipperRoute = express.Router()

/**
 * @route POST /api/shipper/auth/login
 * @description shipper login
 * @access public
 */
authShipperRoute.post('/login', async (req, res) => {
    const {codeOffice, codeStaff, password} = req.body
    try {
    
    const postOffice = await PostOffice.findOne({ code: codeOffice })
    if (!postOffice) {
        return sendError(res, 'Invalid office code')
    }
    const staff = await Staff.findOne({ code: codeStaff, office: postOffice._id, isActive: true })
    if (!staff) {
        return sendError(res, 'Invalid staff code')
    }
    const user = await User.findOne({ role: staff._id });
    if (!user) {
        return sendError(res,'User not found');
    }
    if (!user.isActive) {
        return sendError(res, 'Account locked. Please contact the nearest post office.');
    }
    const isPasswordCorrect = await argon2.verify(user.password, password);
    if (!isPasswordCorrect) {
       if (staff.loginAttempts >= 5) {
        user.isActive = false;
        await user.save(); 
        return sendError(res, 'Account locked');
      } else {
        staff.loginAttempts += 1;
        await staff.save();
        return sendError(res, 'Invalid password');
      }
    }
    if (staff.staff_type !== 'shipper') {
        return sendError(res, 'Not a shipper');
    }
    staff.loginAttempts = 0;
    await staff.save();
    
    let userData={
        _id: staff._id,
        name: staff.name,
        staff_type: staff.staff_type,
        office: staff.office.code,
        address: staff.address
    }
    const accessToken = jwt.sign({ user: userData}, process.env.JWT_SECRET_KEY,{ expiresIn: JWT_EXPIRED})
    const refreshToken = jwt.sign({ user: userData}, process.env.JWT_REFRESH_SECRET_KEY,{ expiresIn: JWT_REFRESH_EXPIRED})
    const response = { accessToken, refreshToken}
        TOKEN_LIST[refreshToken] = response
    return sendSuccess(res, 'Login successfully',{accessToken, refreshToken, user: userData})
    } catch (error) {
    console.error(error)
    return sendError(res, 'Internal server error' )
     }

})

export default authShipperRoute