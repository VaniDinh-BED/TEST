import express from "express";
import { io } from "socket.io-client";
import { NOTIFY_EVENT } from "../../constant.js";
import { sendError, sendServerError, sendSuccess } from "../../helper/client.js";
import Notification from "../../model/Notification.js";
import Order from "../../model/Order.js";
import { verifyToken } from "../../middleware/index.js";
import User from "../../model/User.js"


const orderNotificationRoute = express.Router();

orderNotificationRoute.post("/issue/:orderId",verifyToken, async (req, res) => {
  const { orderId } = req.params;
  const { issueType  } = req.body;

  try {
    const order = await Order.findById(orderId);
    const user = await User.findOne({ role: order.customer});
    if (!order) {
      return sendError(res, "Order not found.", 404);
    }
    order.isIssues = issueType;
    order.save();
    const notification = await Notification.create({
      sender: req.user.id,
      receiver: user._id,
      title: "Order Issue",
      message: `There is an issue with your order (${order.orderId}). Please check the details.`,
      link: `http://localhost:8000/api/orderNotification/detail-order/${orderId}`,
    });

    const socket = io(process.env.SOCKET_SERVER, { reconnection: true });
    socket.emit(NOTIFY_EVENT.send, order.customer, {
      title: notification.title,
      message: notification.message,
      link: notification.link,
    });

    return sendSuccess(res, "Order issue updated successfully.");
  } catch (error) {
    console.log(error.message);
    return sendServerError(res);
  }
});


export default orderNotificationRoute;
