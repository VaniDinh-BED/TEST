import express from "express"
import { PRODUCT_UNIT } from "../constant.js"
import { sendError, sendServerError, sendSuccess } from "../helper/client.js"
import { lookupPostageValidate } from "../validation/tracking.js"
import DeliveryService from '../model/DeliveryService.js'
import Distance from '../model/Distance.js'
import { calculateShipmentFee } from "../service/order.js"
import Tracking from "../model/Tracking.js";
import Order from "../model/Order.js";
import Discount from "../model/Discount.js";
import { verifyToken } from "../middleware/index.js";
import { locateAddress } from "../service/location.js"

const trackingRoute = express.Router()

/**
 * @route POST /api/tracking/postage
 * @description customer look up a postage
 * @access public
 */
trackingRoute.post('/postage', async (req, res) => {
    const errors = lookupPostageValidate(req.body)
    if (errors) return sendError(res, errors)

    const { fromProvince, fromDistrict, fromWard, toProvince, toDistrict, toWard, unit, quantity, serviceId, serviceName, discountId } = req.body
    if (serviceId != null && !serviceId.match(/^[0-9a-fA-F]{24}$/))
        return sendError(res, "ServicedID information is not found.")
    try {
        const sv = await DeliveryService.findOne({
            $or: [
                { _id: serviceId },
                { name: serviceName }
            ]
        }).populate('price')
        if (!sv) return sendError(res, 'the service is not exist.')

        const distances = await Distance.find({
            fromProvince,
            toProvince
        })
        let distance = null
        distances.some(value => {
            if (sv.distances.includes(value._id)) {
                distance = value
                return true
            }
            return false
        })
        if (!distance) return sendError(res, 'the service don\'t support this road.')

        let discount = 0
        const discountInfo = await Discount.findById(discountId)
        if (discountInfo) discount = discountInfo.discount

        let result = await calculateShipmentFee(distance, quantity, sv.price, unit, discount)
        return sendSuccess(res, 'calculate shipment fee successfully.', { result })
    } catch (error) {
        console.log(error)
        return sendServerError(res)
    }
})

/**
 * @route POST /api/tracking
 * @description create new tracking of order
 * @access private
 */
trackingRoute.post('/', verifyToken, async (req, res) => {
    const { orderId } = req.body;
    try {
        const order = await Order.findOne({ orderId: orderId });
        if (!order)
            return sendSuccess(res, "Order has been found")
        const trackingExist = await Tracking.exists({ order: order });
        if (trackingExist)
            return sendSuccess(res, "Tracking for orderID is exist");
        const tracking = await Tracking.create({ order: order });
        return sendSuccess(res, "Create new tracking successfully.", tracking);
    } catch (error) {
        console.log(err);
        return sendServerError(res);
    }
})

/**
 * @route GET /api/tracking/:orderId
 * @description get goods' movement tracking by orderId
 * @access public
 */
trackingRoute.get("/:orderId", async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return sendError(res, "Orders does not exist.");
        }
        const tracking = await Tracking.findOne({ order: order })
        if (tracking) {
            return sendSuccess(res, 'get tracking successful', tracking)
        }
        return sendError(res, 'Tracking does not exist', 404)
    }
    catch (err) {
        console.log(err);
        sendError(err);
    }
})

/**
 * @route PUT /api/tracking/:id
 * @description update tracking
 * @access private
 */
trackingRoute.put("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return sendError(res, "Tracking does not exist.");
        }
        const tracking = await Tracking.findById(id);
        if (tracking) {
            const { location, status } = req.body;
            let province = null;
            // check whether address is real or not
            if (typeof location === 'object') {
                let data = await locateAddress(location.street + location.ward + location.district + location.province);
                if (!data) return sendError(res, 'Location is not existing.');
                province = location.province;
            }
            else {
                const locationWh = await Warehouse.findById(location).select({ _id: 1, province: 1 });
                location = locationWh._id;
                province = originWh.province;
                if (!location) return sendError(res, "Location warehouse doesn't exist.");
            }
            const newTracking = await Tracking.findByIdAndUpdate(id, { status, location });
            return sendSuccess(res, 'Change status of the order successfully.', newTracking);
        }
        else
            return sendError(res, "Tracking does not exist.");
    }
    catch (err) {
        console.log(err);
        return sendServerError(res);
    }
})

export default trackingRoute