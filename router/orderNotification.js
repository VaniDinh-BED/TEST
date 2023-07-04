import express from "express";
import { io } from "socket.io-client";
import { NOTIFY_EVENT } from "../constant.js";
import { sendError, sendServerError, sendSuccess } from "../helper/client.js";
import Notification from "../model/Notification.js";
import Order from "../model/Order.js";
import { verifyToken,verifyCustomer } from "../middleware/index.js";
import Customer from "../model/Customer.js"
import User from "../model/User.js"
import Staff from "../model/Staff.js";


const orderNotificationRoute = express.Router();

orderNotificationRoute.get("/", verifyToken, verifyCustomer, async (req, res) => {
  const limit = req.query.limit || 15;
  const user = await User.findById(req.user.id);
  if (!user) {
    return sendError(res, "User not found", 404);
  } 
  try {
    const { fromDate, toDate  } = req.query;
    let query = { receiver: user };
    
    if (fromDate && toDate) {
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
      
    return sendSuccess(res, "Request successful.", notifications);
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
});

orderNotificationRoute.get("/detail-issues/:notificationId", verifyToken, verifyCustomer, async (req, res) => {
  const { notificationId } = req.params;

  try {
    const notification = await Notification.findById(notificationId);
    const staffuser = await User.findById(notification.sender);
    const staff = await Staff.findById(staffuser.role);
    
    const customerUser = await User.findById(notification.receiver);
    const customer = await Customer.findById(customerUser.role );

    if (!notification) {
      return sendError(res, "Notification not found.", 404);
    }
    const { _id, title, createdAt} = notification;
    return sendSuccess(res, "Request successful.", {
      OrderId:_id,
      sender: staff.name,
      receiver:customer.name,
      title,
      createdAt
    });
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
});

orderNotificationRoute.get("/detail-order/:orderId", async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findById({ _id: orderId });
  
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      res.json({ message: "Order found", order });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  });
export default orderNotificationRoute;
