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

        const _postOffice = PostOffice.findById(id);

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
