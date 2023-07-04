import mongoose from "mongoose"
import { RETURN_ZONE, PRODUCT_UNIT, ORDER_STATUS, PRODUCT_STATUS, PICK_UP_AT, NOTIFY_EVENT } from "../constant.js"
import Order from "../model/Order.js"
import Product from "../model/Product.js"
import Warehouse from "../model/Warehouse.js"
import DeliveryService from "../model/DeliveryService.js"
import Customer from "../model/Customer.js"
import User from "../model/User.js"
import { findNearestWarehouse } from "./location.js"
import { findRoutes } from "./DijkstraWeightedGraph.js"
import { sendError, sendServerError, sendSuccess, sendAutoMail, sendAutoSMS } from "../helper/client.js";
import { io } from "socket.io-client"
import { CASH_PAYMENT } from "../constant.js";
import Staff from "../model/Staff.js";
/**
 * generate ID for an order
 * @returns {string} generated order ID
 */
export const genarateOrderID = async () => {
  try {
    while (true) {
      const orderId = Math.floor(
        10000000 + Math.random() * 90000000
      ).toString();
      const isExist = await Order.exists({
        orderId,
      });
      if (!isExist) {
        return orderId;
      }
    }

  } catch (error) {
    console.log(error);
    return null;
  }
};

/**
 * generate ID for an order
 * @returns {string} generated order ID
 */
export const genarateBillofLandingID = async () => {
  try {
    while (true) {
      const billId = Math.floor(
        100000000 + Math.random() * 900000000
      ).toString();
      return billId;
    }

  } catch (error) {
    console.log(error);
    return null;
  }
};
/**
 * calculate order fee
 * @param {ObjectId} orderId
 * @returns {Number|null}
 */
export const calculateOrderFee = async (orderId) => {
  let fee = null;
  try {
    const products = await Product.find({ order: orderId }).populate(
      "product_shipments",
      "value quantity"
    );
    products.forEach((pro) => {
      pro.product_shipments.forEach((shipment) => {
        fee += shipment.value * shipment.quantity;
      });
    });
  } catch (error) {
    console.log(error);
  }
  return fee;
};

/**
 * generate a chain of routes
 * @param {*} origin
 * @param {*} destination
 * @returns {string[]|null} the chain of roads for transporting shipments
 */
export const generateRoute = async (service, origin, destination) => {
  try {
    const originWh = (
      origin.loading === PICK_UP_AT.SHIP
        ? await findNearestWarehouse(origin.address)
        : origin.address
    )._id;
    const destinationWh = (
      destination.unloading === PICK_UP_AT.SHIP
        ? await findNearestWarehouse(destination.address)
        : destination.address
    )._id;
    const route = await findRoutes(
      service,
      originWh.toString(),
      destinationWh.toString()
    );
    if (route) {
      route.map((ele) => mongoose.Types.ObjectId(ele));
    }
    return route;
  } catch (error) {
    console.log(error);
    return null;
  }
};


export const canChangeOrderStatus = async (order, nxtSta) => {
  try {
    const curSta = order.timeline[order.timeline.length - 1].status;
    if(!curSta) return false;
    if (curSta === ORDER_STATUS.waiting_for_pickup && (nxtSta === ORDER_STATUS.in_progress || nxtSta === ORDER_STATUS.canceled)) {
      return true
    } else if (curSta === ORDER_STATUS.in_progress && (nxtSta === ORDER_STATUS.dispatching || nxtSta === ORDER_STATUS.in_return)) {
      return true
    } else if ((curSta === ORDER_STATUS.in_return || curSta === ORDER_STATUS.dispatching || curSta === ORDER_STATUS.problem_order) && (nxtSta === ORDER_STATUS.dispatched || nxtSta === ORDER_STATUS.dispatching || nxtSta === ORDER_STATUS.problem_order || nxtSta === ORDER_STATUS.in_progress || nxtSta === ORDER_STATUS.return_confirmation)) {
      return true
    } else if (curSta === ORDER_STATUS.return_confirmation && (nxtSta === ORDER_STATUS.return_success || nxtSta === ORDER_STATUS.problem_order)) {
      return true
    } else { return false }
  } catch (error) {
    console.log(error)
    return false
  }
};

/**
 * handle order with product information
 * @param {Order} order order need to be handled
 * @returns {Object} order with more information
 */
export const handleOrderInfo = async (order) => {
  if (!order) return order;
  const swallowOrder = { ...order._doc };
  try {
    order = await order.populate([
      {
        path: "service",
        select: ["name"],
        model: DeliveryService,
      },
      {
        path: "customer",
        select: ["name", "customer_type"],
        model: Customer,
      },
      {
        path: "route",
        model: Warehouse,
        select: [
          "name",
          "phone",
          "street",
          "ward",
          "district",
          "province",
          "lon",
          "lat",
        ],
      },
    ]);
    if (mongoose.Types.ObjectId.isValid(order.origin.address)) {
      order = await order.populate({
        path: "origin.address",
        model: Warehouse,
        select: [
          "name",
          "phone",
          "street",
          "ward",
          "district",
          "province",
          "lon",
          "lat",
        ],
      });
    }

    if (mongoose.Types.ObjectId.isValid(order.destination.address)) {
      order = await order.populate({
        path: "destination.address",
        model: Warehouse,
        select: [
          "name",
          "phone",
          "street",
          "ward",
          "district",
          "province",
          "lon",
          "lat",
        ],
      });
    }

    if (order.route && order.route.length > 0) {
      order = await order.populate({
        path: "route",
        model: Warehouse,
        select: [
          "name",
          "phone",
          "street",
          "ward",
          "district",
          "province",
          "lon",
          "lat",
        ],
      });
    }

    const products = await Product.find({ order: order._id }).select([
      "-order",
      "-__v",
      "-product_shipments",
    ]);
    return { ...order._doc, products };
  } catch (error) {
    console.log(error);
    return swallowOrder;
  }
};

/**
 * handle order with product information
 * @param {Order} order order need to be handled detail cost
 * @returns {Object} order with more information
 */
export const handleOrderInfoWithCost = async (order) => {
  if (!order) return order;
  const swallowOrder = { ...order._doc };
  try {
    order = await order.populate([
      {
        path: "service",
        select: ["name"],
        model: DeliveryService,
      },
      {
        path: "customer",
        select: ["name", "customer_type"],
        model: Customer,
      },
      {
        path: "route",
        model: Warehouse,
        select: [
          "name",
          "phone",
          "street",
          "ward",
          "district",
          "province",
          "lon",
          "lat",
        ],
      },
    ]);
    if (mongoose.Types.ObjectId.isValid(order.origin.address)) {
      order = await order.populate({
        path: "origin.address",
        model: Warehouse,
        select: [
          "name",
          "phone",
          "street",
          "ward",
          "district",
          "province",
          "lon",
          "lat",
        ],
      });
    }

    if (mongoose.Types.ObjectId.isValid(order.destination.address)) {
      order = await order.populate({
        path: "destination.address",
        model: Warehouse,
        select: [
          "name",
          "phone",
          "street",
          "ward",
          "district",
          "province",
          "lon",
          "lat",
        ],
      });
    }

    if (order.route && order.route.length > 0) {
      order = await order.populate({
        path: "route",
        model: Warehouse,
        select: [
          "name",
          "phone",
          "street",
          "ward",
          "district",
          "province",
          "lon",
          "lat",
        ],
      });
    }

    const products = await Product.find({ order: order._id }).populate({
      path: "product_shipments",
      select: "value"
    }).select([
      "-order",
      "-__v",
    ]);
    return { ...order._doc, products };
  } catch (error) {
    console.log(error);
    return swallowOrder;
  }
};

/**
 * calculate shipment fee
 * @param {Distance} distance
 * @param {Number} quantity
 * @param {Price} price
 * @param {Number} discount // discount >= 0 && discount <= 100 (percent)
 * @param {String} unit // PRODUCT_UNIT: 'kg' || 'm3' || 'ton'
 * @param {{value: number, base: boolean}[]} tax // value >= 0, base is true means tax will be increated from base price, the preceding tax element is used first
 * @param {Number[]} surcharge // surcharge >= 0, the preceding tax element is used first
 * @returns {Number} total price
 */
export const calculateShipmentFee = async (
  distance,
  quantity,
  price,
  unit,
  discount = 0,
  tax = [],
  surcharge = []
) => {
  let totalPrice = 0;
  if (unit === PRODUCT_UNIT.KG)
    totalPrice = await calculateShipmentFeeUtl(distance, quantity, price.uKG);
  else if (unit === PRODUCT_UNIT.TON)
    totalPrice = await calculateShipmentFeeUtl(distance, quantity, price.uTON);
  else if (unit === PRODUCT_UNIT.M3)
    totalPrice = await calculateShipmentFeeUtl(distance, quantity, price.uM3);
  let basePrice = totalPrice;
  if (tax.length > 0) {
    tax.forEach((ele) => {
      if (ele.value >= 0) {
        if (ele.base) totalPrice += basePrice * ele.value;
        else totalPrice *= 1 + ele.value;
      }
    });
  }
  if (surcharge.length > 0) {
    surcharge.forEach((value) => {
      if (value >= 0) {
        totalPrice += value;
      }
    });
  }

  // apply discount
  totalPrice *= (1 - discount / 100);
  return Math.ceil(totalPrice / 1000) * 1000;
};

const calculateShipmentFeeUtl = async (distance, weight, price) => {
  let totalPrice = 0;
  const priceIdx = Object.keys(RETURN_ZONE).indexOf(distance.zonecode);
  let idx = 0;
  let value = price[idx];
  while (weight > 0 && idx < price.length) {
    if (value.next) {
      totalPrice += value.prices[priceIdx];
      weight -= value.sidestep;
      idx += 1;
    } else {
      totalPrice += value.prices[priceIdx];
      weight -= value.sidestep;
      idx += 1;
      value = price[idx];
    }
  }
  return totalPrice;
};
//send feeback order to user
export const sendFeedback = async (staffId, content, IdCustomer) => {
  try {
    const staff = await User.findById(staffId);
    const customer = await Customer.findById(IdCustomer);
    const user = await User.findOne({ role: customer._id });
    if (staff.email) {
      const optionsStaff = {
        from: process.env.MAIL_HOST,
        to: staff.email,
        subject: "[noreply-Logistics Webapp]  Feedback customer",
        html: `<p>Feedback của khách hàng: ${customer.name}</p>
                   <p>IdCustomer: ${IdCustomer}</p>
                   <P>Nội dung: ${content}</p>`,
      };
      const sendMailToStaff = await sendAutoMail(optionsStaff);
    } else {
      //Send SMS
      const optionsStaff = {
        from: process.env.PHONE_NUMBER,
        to: staff.phone,
        body: `Feedback từ khách hàng: ${customer.name} có ID: ${IdCustomer} với nội dung: ${content}`,
      };
      const senSMSToStaff = await sendAutoSMS(optionsStaff);
    }

    if (user.email) {
      const optionsCustomer = {
        from: process.env.MAIL_HOST,
        to: user.email,
        subject: "[noreply-Logistics Webapp]  Feedback customer",
        html: `<p>Chúng tôi đã nhân được feedback từ quý khách </p>
                       <P>Nội dung: ${content}</p>
                       <P>Xin chân thành sự phản hồi của quý khách !</p>`,
      };
      const sendMailToCustomer = await sendAutoMail(optionsCustomer);
    } else {
      const optionsCustomer = {
        from: process.env.PHONE_NUMBER,
        to: user.phone,
        body: `Chúng tôi đã nhận được feedback từ bạn, Xin chân thành cảm ơn sự phản hồi của quý khách`,
      };
      const sendSMSToCustomer = await sendAutoSMS(optionsCustomer);
    }
    const nameCustomer = customer.name;
    const socket = io(process.env.SOCKET_SERVER, { reconnection: true });
    socket.emit(NOTIFY_EVENT.send, staffId, {
      IdCustomer,
      nameCustomer,
      content,
    });
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
};

export const sendtokenfeedbacktoCustomer = async (customerID, content) => {
  const socket = io(process.env.SOCKET_SERVER, { reconnection: true });
  socket.emit(NOTIFY_EVENT.send, customerID, { content });
};

export const sendOrderMessageToCustomer = async (orderId, message, ...moreInfo) => {
  try {
    const order = await Order.findOne({ orderId });
    const customerId = order.customer;
    const user = await User.findOne({ role: customerId });
    const products = await Product.find({ customerId });
    const delivery_services = await DeliveryService.findOne({
      _id: order.service,
    });

    if (user.email) {
      //send email
      const options = {
        from: process.env.MAIL_HOST,
        to: user.email,
        subject: "[noreply-Logistics Webapp] Order details information",
        html: `<p>${message}</b>.</p>
                             <p>Dịch vụ của bạn: ${delivery_services.name}</p>
                             <p>Mã Đơn hàng: ${order.orderId}</p>
                             <p>${moreInfo}</p>
                             `,
      };
      const sendMailSuccess = await sendAutoMail(options);
      if (!sendMailSuccess) return false;
    } else {
      //Send SMS
      const options = {
        from: process.env.PHONE_NUMBER,
        to: user.phone,
        body: `${message}. Dịch vụ của bạn: ${order.service.name}. Mã đơn hàng: ${order.orderId}, ${moreInfo}`,
      };
      const sendSMSSuccess = await sendAutoSMS(options);
      if (!sendSMSSuccess) return false;
    }
    const serviceName = delivery_services.name;
    const userId = user._id;
    const socket = io(process.env.SOCKET_SERVER, { reconnection: true });
    socket.emit(NOTIFY_EVENT.send, userId, {
      order,
      products,
      serviceName,
      orderId,
    });
  } catch (error) {
    console.log(error);
    return false;
  }
}

export const getOrderWithFilters = async (pageSize, page, sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, orderStatus, codStatus, beginDateSend, endDateSend, beginDateReceive, endDateReceive, beginCollected, endCollected, cashPayment) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "staffs",
          localField: "delivery_staff",
          foreignField: "_id",
          as: "deliveryStaffInfo"
        }
      },
      {
        $lookup: {
          from: "staffs",
          localField: "confirm_staff",
          foreignField: "_id",
          as: "confirmStaffInfo"
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "deliveryStaffInfo.department",
          foreignField: "_id",
          as: "departmentInfo"
        }
      },
      {
        $lookup: {
          from: "car_fleets",
          localField: "deliveryStaffInfo.car_fleet",
          foreignField: "_id",
          as: "carFleetInfo"
        }
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customerInfo"
        }
      },
      {
        $addFields: {
          lastTimelineStatus: { $arrayElemAt: ["$timeline", -1] },
          lastTimeLineCodStatus: { $arrayElemAt: ["$cod.timeline", -1]}
        }
      },
      {
        $match: {
          $and: [
            confirmStaff ? { "confirmStaffInfo.name": { $regex: confirmStaff, $options: "i" }} : {},
            deliveryStaff ? { "deliveryStaffInfo.name": { $regex: deliveryStaff, $options: "i" }} : {},
            department ? { "departmentInfo.name": { $regex: department, $options: "i" } } : {},
            carFleet ? { "carFleetInfo.name": { $regex: carFleet, $options: "i" } } : {},
            customer ? { "customerInfo.name": { $regex: customer, $options: "i" } } : {},
            orderStatus ? { "lastTimelineStatus.status": orderStatus } : {},
            codStatus ? { "lastTimeLineCodStatus.status": codStatus } : {},
            cashPayment ? { "cash_payment": { $regex: cashPayment, $options: "i" } } : {},
            beginDateSend && endDateSend ? { "createdAt": { $gte: new Date(beginDateSend), $lte: new Date(endDateSend) } } : {},
            beginDateReceive && endDateReceive ? { "lastTimelineStatus.time": { $gte: new Date(beginDateReceive), $lte: new Date(endDateReceive) } } : {},
            beginCollected && endCollected ? { "lastTimeLineCodStatus.time": { $gte: new Date(beginCollected), $lte: new Date(endCollected) } } : {},
            keyword ? {
              $or: [
                { orderId: { $regex: keyword, $options: "i" } },
                { "receiver.name": { $regex: keyword, $options: "i" } },
                { "receiver.phone": { $regex: keyword, $options: "i" } },
                { "product.name": { $regex: keyword, $options: "i" } },
                { "shipping.id": { $regex: keyword, $options: "i" } },
                { "product.note": { $regex: keyword, $options: "i" } },
                { "product.payment_methods": { $regex: keyword, $options: "i" } },
              ]
            } : {},
          ]
        }
      },
      { $sort: { [sortBy || "createdAt"]: 1 } },
      { $skip: pageSize*page }, 
      { $limit: pageSize || 100} 
    ];
    const results = await Order.aggregate(pipeline);
    if (results.length === 0) {
      return "Order not found";
    }
    return results;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

export const handleGroupOrderByDeliveryStaff = async (result) => {
    try {
        const deliveryStaff = await Staff.findById(result[result.length - 1].delivery_staff);
        const timeCollected = result[result.length - 1].lastTimeLineCodStatus.time;
        const totalData = result.reduce((acc, item) => {
            const { delivery_staff, cod, shipping, cash_payment } = item;
            if (!acc[delivery_staff._id]) {
                acc[delivery_staff._id] = {
                    moneyPP: cash_payment === CASH_PAYMENT.PP_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
                    moneyCC: cash_payment === CASH_PAYMENT.CC_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
                    cod: cod.cod ? parseInt(cod.cod) : 0,
                    count: 1
                };
            } else {
                acc[delivery_staff._id].moneyPP += cash_payment === CASH_PAYMENT.PP_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
                    acc[delivery_staff._id].moneyCC += cash_payment === CASH_PAYMENT.CC_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
                    acc[delivery_staff._id].cod += cod.cod ? parseInt(cod.cod) : 0,
                    acc[delivery_staff._id].count += 1;
            }
            return acc;
        }, {});
        const codTable = result.map((item) => {
            return {
                time: item.createdAt,
                orderId: item.orderId,
                moneyPP: item.cash_payment === CASH_PAYMENT.PP_CASH ? (item.shipping.total_amount_after_tax_and_discount ? parseInt(item.shipping.total_amount_after_tax_and_discount) : 0) : 0,
                moneyCC: item.cash_payment === CASH_PAYMENT.CC_CASH ? (item.shipping.total_amount_after_tax_and_discount ? parseInt(item.shipping.total_amount_after_tax_and_discount) : 0) : 0,
                COD: parseInt(item.cod.cod)
            }
        });
        const newData = {
            delivery_staff: deliveryStaff,
            time_collected: timeCollected,
            total: totalData,
            table: codTable
        }
        return newData;
    } catch (error) {

    }
}

