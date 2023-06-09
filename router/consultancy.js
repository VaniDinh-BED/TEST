import express from "express"
import { sendError, sendServerError, sendAutoMail, sendSuccess } from "../helper/client.js"
import { createAppointmentValidate, createConsultancyValidate } from "../validation/consultancy.js"
import Consultancy from "../model/Consultancy.js"
import DeliveryService from "../model/DeliveryService.js"
import CustomerAppointment from "../model/CustomerAppointment.js"

const consultancyRoute = express.Router()

/**
 * @route POST /api/consultant
 * @description Anyone can send resgister-consultant
 * @access public
 */
consultancyRoute.post('/',
    async (req, res) => {
        const err = createConsultancyValidate(req.body)
        if (err) return sendError(res, err)
        try {
            const { service, name, email, phone, district, province, ward, fulladdress, parcel, quantity } = req.body
            const isExistService = await DeliveryService.exists({ name: service })
            if (!isExistService) return sendError(res, 'The service is not existed.')

            const optionsToCS = {
                from: process.env.MAIL_HOST,
                to: process.env.MAIL_HOST,
                subject: "[Logistics-Webapp] Tin nhắn Tư vấn từ trang tư vấn",
                html: `<p>Họ và tên: <b>${name}</b></p>
                <p>Email: ${email}</p>
                <p>Số điện thoại: ${phone}</p>
                <p>Địa chỉ: ${fulladdress}</p>
                <p>Dịch vụ vận chuyển: ${service}</p>
                <p>Thông tin kiện hàng: </br>
                    Tên hàng: <b>${parcel}</b>
                    Số lượng: <b>${quantity}</b
                </p>
                `
            }
            await Consultancy.create({ service, name, email, phone, district, province, ward, fulladdress, parcel, quantity })
            const sendMail = await sendAutoMail(optionsToCS)
            if (!sendMail) return sendError(res, 'Send email failed.')
            return sendSuccess(res, 'Send email successfully.')
        } catch (error) {
            console.log(error)
            return sendServerError(res)
        }
    }
)

consultancyRoute.post("/appointment", async (req, res) => {
    try {
        const errors = createAppointmentValidate(req.body);
        if (errors) return sendError(res, errors);

        const { customer, description, time } = req.body;

        const appointment = await CustomerAppointment.create({ customer, description, time });
        return sendSuccess(res, "Successful", appointment);
    } catch (err) {
        console.log(err);
        sendServerError(err);
    }
});

export default consultancyRoute