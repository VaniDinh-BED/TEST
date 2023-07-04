import express from 'express'
import argon2 from "argon2"
import { sendError, sendServerError, sendSuccess } from '../../helper/client.js'
import Staff from '../../model/Staff.js'
import User from '../../model/User.js'
import { staffRegisterValidate } from '../../validation/auth.js'
import Department from '../../model/Department.js'
import CarFleet from '../../model/CarFleet.js'
const authAdminRoute = express.Router()

/**
 * @route POST /api/admin/auth/register
 * @description register staff account
 * @access private
 */
authAdminRoute.post('/register',
    async (req, res) => {
        const errors = staffRegisterValidate(req.body)
        if (errors)
            return sendError(res, errors)

        let { name, address, email, password, phone, staff_type, staff_position, department, car_fleet } = req.body

        if(department != null && !department.match(/^[0-9a-fA-F]{24}$/)){
            return sendError(res, 'Department does not exits.')
        }

        if(car_fleet != null && !car_fleet.match(/^[0-9a-fA-F]{24}$/)){
            return sendError(res, 'CarFleet does not exits.')
        }

        try {
            const isExist = await User.exists({ email }) || await User.exists({ phone })
            if (isExist) return sendError(res, 'user already exists.')
            const departmentExist = await Department.findById(department)
            if(!departmentExist && department != null) return sendError(res, 'Department does not exits.')
            const carfleetExist = await CarFleet.findById(car_fleet)
            if(!carfleetExist && car_fleet != null) return sendError(res, 'Carfleet does not exits.')
            const newStaff = await Staff.create({
                name,
                address,
                staff_type,
                staff_position,
                department,
                car_fleet
            })

            password = await argon2.hash(password)
            await User.create({
                name, email, password, phone, role: newStaff._id, isActive: true
            })
        } catch (error) {
            console.log(error)
            return sendServerError(res)
        }
        return sendSuccess(res, 'user registered successfully.')
    }
)

export default authAdminRoute