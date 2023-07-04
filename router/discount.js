import express from "express";
import { sendError, sendSuccess, sendServerError } from "../helper/client.js";
import Discount from "../model/Discount.js";
import { verifyAdmin, verifyCustomer, verifyToken } from "../middleware/index.js";
import mongoose from "mongoose";

const discountRoute = express.Router();

/**
 * @route GET /api/discount/:customerId
 * @description get discount list of a user
 * @access private
 */

discountRoute.get("/:customerId", verifyCustomer, async (req, res) => {
  try {
    const { customerId } = req.params
    let listDiscount = await Discount.find({ customer_id: customerId });
    return sendSuccess(res, "Get list discount successfully.", listDiscount);
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
});

export default discountRoute;
