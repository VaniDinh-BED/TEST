import express from "express";
import { sendError, sendServerError, sendSuccess } from "../../helper/client.js"
import { verifyToken, verifyCustomer, verifyAdmin, createBusinessDir } from "../../middleware/index.js"
import { POSTOFFICE, uploadResources } from '../../constant.js'
import { genaratePostOfficeCode } from "../../service/postOffice.js";
import fs from 'fs'
import PostOffice from "../../model/PostOffice.js";
import PostOfficeCode from "../../model/PostOfficeCode.js";
import Order from "../../model/Order.js";
import mongoose from "mongoose"
import { postOfficeValidate } from "../../validation/postOffice.js";


const postOfficeAdminRoute = express.Router();


/**
 * @route POST /api/admin/post-office
 * @description create postOffice
 * @access public
 */
postOfficeAdminRoute.post("/", async (req, res) => {
    try {
        const errors = postOfficeValidate(req.body);
        if (errors) return sendError(res, errors);

        const { name, province, district, address } = req.body;

        var code = await genaratePostOfficeCode(province, district);

        if (code == "") {
            return sendError(res, "Failed! Province or district is not valid");
        }

        const postOffice = await PostOffice.create({
            code: code,
            name: name,
            province: province,
            district: district,
            address: address,
        });

        return sendSuccess(res, "Add postOffice successfully.", postOffice);
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
})


/**
 * @route GET /api/admin/post-office
 * @description get postOffice
 * @access public
 */
postOfficeAdminRoute.get("/", async (req, res) => {
    try {
        var postOffices = await PostOffice.find();
        return sendSuccess(res, "Add postOffice successfully.", postOffices);
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
})

/**
 * @route GET /api/admin/post-office/:code
 * @description get postOffice
 * @access public
 */
postOfficeAdminRoute.get("/:code", async (req, res) => {
    try {
        let { code } = req.params
        var postOffices = await PostOffice.find({ code });
        return sendSuccess(res, "Add postOffice successfully.", postOffices);
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
})

/**
 * @route GET /api/admin/post-office/inventory/:postId
 * @description get postOffice
 * @access public
 */
postOfficeAdminRoute.get("/inventory/:postId", async (req, res) => {
    try {
        let { postId } = req.params
        let exist = await PostOffice.exists({ _id: postId })
        if (!exist) {
            return sendError(res, "Post office not exist")
        }
        let orderLength = await Order.find({ destination: postId, status: { $in: ["dispatching", "in return"] } }).count()
        let order = await Order.find({ destination: postId, status: { $in: ["dispatching", "in return"] } })
        let inventory_weight = 0, inventory_carrying_cost = 0, inventory_COD = 0
        await order.forEach(order => {
            inventory_weight += +order.product.weight,
                inventory_carrying_cost += +order.shipping.total_amount_after_tax_and_discount,
                inventory_COD += +order.cod.cod
        })
        return sendSuccess(res, "Add postOffice successfully.", { inventory_number: orderLength, inventory_weight: inventory_weight, inventory_carrying_cost: inventory_carrying_cost, inventory_COD: inventory_COD });
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
})

/**
 * @route PATCH /api/admin/post-office/:id
 * @description get postOffice
 * @access public
 */
postOfficeAdminRoute.patch("/:id", async (req, res) => {
    try {
        let { id } = req.params;

        if (mongoose.isValidObjectId(id) == false) {
            return sendError(res, "Failed! Id params is not valid ObjectId");
        }

        const _postOffice = await PostOffice.findById(id);

        if (_postOffice == null || _postOffice == undefined) {
            return sendError(res, "Failed! Post office is not exist");
        }

        const errors = postOfficeValidate(req.body);
        if (errors) return sendError(res, errors);

        const { name, province, district, address } = req.body;

        var code = await genaratePostOfficeCode(province, district);

        if (code == "") {
            return sendError(res, "Failed! Province or district is not valid");
        }

        var postOffice = await PostOffice.findByIdAndUpdate(id, {
            code: code,
            name: name,
            province: province,
            district: district,
            address: address,
        });

        return sendSuccess(res, "Update postOffice successfully.", postOffice);
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
})

/**
 * @route DELETE /api/admin/post-office/:id
 * @description delete postOffice
 * @access public
 */
postOfficeAdminRoute.delete("/:id", async (req, res) => {
    try {
        let { id } = req.params;

        if (mongoose.isValidObjectId(id) == false) {
            return sendError(res, "Failed! Id params is not valid ObjectId");
        }

        const _postOffice = await PostOffice.findById(id);

        if (_postOffice == null || _postOffice == undefined) {
            return sendError(res, "Failed! Post office is not exist");
        }

        var postOffice = await PostOffice.findByIdAndRemove(id);
        return sendSuccess(res, "Delete postOffice successfully.", postOffice);
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
})

export default postOfficeAdminRoute;
