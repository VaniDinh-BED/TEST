import express from "express"
import { sendError, sendServerError, sendSuccess } from "../helper/client.js"
import { createOrderValidate, updateOrderValidate } from "../validation/order.js"
import { locateAddress } from "../service/location.js"
import { verifyToken, verifyCustomer, verifyCustomerOrAdmin, verifyStaff } from "../middleware/index.js"
import { genarateOrderID, genarateBillofLandingID, handleOrderInfo, handleOrderInfoWithCost } from "../service/order.js"
import DeliveryService from "../model/DeliveryService.js"
import Order from "../model/Order.js"
import Product from "../model/Product.js"
import Warehouse from "../model/Warehouse.js"
import User from "../model/User.js"
import Customer from "../model/Customer.js"
import { COD_STATUS, ORDER_STATUS , SCAN_TYPE } from "../constant.js"
import { isServedByService } from "../service/deliveryService.js"
import { sendFeedback, sendtokenfeedbacktoCustomer } from "../service/order.js"

const orderRoute = express.Router();

/**
 * @route POST /api/order
 * @description customer create a new order
 * @access private
 */
orderRoute.post("/", verifyToken, verifyCustomer, async (req, res) => {
  try {
    // const errors = createOrderValidate(req.body);
    // if (errors) return sendError(res, errors);

    const { sender, receiver, product, shipping } = req.body
    // check whether service is available
    // const serviceObj = await DeliveryService.findOne({ name: service });
    // if (!serviceObj)
    //   return sendError(res, "Delivery service is not available.");

    // let province = null;
    // let endprovince = null;
    // // check whether address is real or not
    // if (typeof origin.address === "object") {
    //   let data = await locateAddress(
    //     origin.address.street +
    //     origin.address.ward +
    //     origin.address.district +
    //     origin.address.province
    //   );
    //   if (!data) return sendError(res, "Origin is not existing.");
    //   province = origin.address.province;
    // } else {
    //   const originWh = await Warehouse.findById(origin.address).select({
    //     _id: 1,
    //     province: 1,
    //   });

    //   province = originWh.province;
    //   if (!origin.address)
    //     return sendError(res, "Origin warehouse doesn't exist.");
    // }

    // if (typeof destination.address === "object") {
    //   let data = await locateAddress(
    //     destination.address.street +
    //     destination.address.ward +
    //     destination.address.district +
    //     destination.address.province
    //   );
    //   if (!data) return sendError(res, "Destination is not existing.");
    //   endprovince = destination.address.province;
    // } else {
    //   const destinationWh = await Warehouse.findById(
    //     destination.address
    //   ).select({ _id: 1, province: 1 });
    //   endprovince = destinationWh.province;
    //   if (!destination.address)
    //     return sendError(res, "Destination warehouse doesn't exist.");
    // }
    // if (!(await isServedByService(serviceObj, province, endprovince)))
    //   return sendError(res, "No available service serve this route.");

    const orderId = await genarateOrderID()
    const bill_of_landing = await genarateBillofLandingID()
    const order = await Order.create({ orderId, customer: req.user.role._id, sender, receiver, cod: { cod: "0", fee: "0", control_money: "0" }, shipping: { id: bill_of_landing, ...shipping }, product })
    // const { name, types, goods_value, other, quantity, weight, unit, note, service } = await product;
    // await Product.create({ name, types, goods_value, other, quantity, weight, unit, note, service, order: order._id })
    return sendSuccess(res, "Create new order successfully", order)
  } catch (error) {
    console.log(error);
    return sendServerError(res)
  }
})

/**
 * @route get /api/order/customer
 * @description get order of customer by date
 * @access private
 */
orderRoute.get("/customer", verifyToken, verifyCustomer, async (req, res) => {
  try {
    const customerId = req.user.role._id;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0
    const page = req.query.page ? parseInt(req.query.page) : 0
    const { sortBy, keyword, status } = req.query
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate + "T23:59:59");
    if (startDate == 'Invalid Date' || endDate == 'Invalid Date') {
         return sendError(res, "Invalid Date")
      }
    let query = {}
    if (keyword) {
      query.$or = [
        { orderId: { $regex: keyword, $options: 'i' } },
        { 'receiver.name': { $regex: keyword, $options: 'i' } },
        { 'receiver.phone': { $regex: keyword, $options: 'i' } },
        { 'product.name': { $regex: keyword, $options: 'i' } },
        { 'shipping.id': { $regex: keyword, $options: 'i' } },
      ]
    }
    if (customerId) {
      query.customer = customerId
    }
    if (status) {
      query.status = status
    }
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate  }
    }
    const returnedOrders = await Order.find(query)
      .limit(pageSize)
      .skip(pageSize * page)
      .sort(`${sortBy}`)
    if (returnedOrders.length === 0) {
      return sendError(res, "No orders found")
    }
    return sendSuccess(res, 'Get order successfully', returnedOrders)
  } catch (error) {
    console.error(error.message);
    return sendServerError(res);
  }
});


/**
 * @route GET /api/order/:orderId
 * @description customer see their order by orderId
 * @access private
 */
orderRoute.get("/:orderId", verifyToken, verifyCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId })
    if (order) return sendSuccess(res, "get order successfully.", order);
    return sendError(res, `The order ${orderId} does not exist.`);
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
});

/**
 * @route PUT /api/order/:orderId
 * @description customer can update their order when order status is waiting
 * @access private
 */
orderRoute.put("/:orderId", verifyToken, verifyCustomer, async (req, res) => {
  try {
    const errors = updateOrderValidate(req.body);
    if (errors) return sendError(res, errors);

    const { sender, receiver, product, shipping } = req.body;
    const orderId = req.params.orderId;

    const order = await Order.findOne({ orderId });
    if (!order) return sendError(`The order ${orderId} does not exist.`);
    if (order.timeline.slice(-1).status !== ORDER_STATUS.waiting)
      return sendError(
        "Can not edit this order because it is not in waiting process."
      );

    // check whether address is real or not
    // if (typeof origin.address === "object") {
    //   let data = await locateAddress(
    //     origin.address.street +
    //     origin.address.ward +
    //     origin.address.district +
    //     origin.address.province
    //   )
    //   if (!data) return sendError(res, "Origin is not existing.")
    // } else {
    //   origin.address = await Warehouse.exists({ _id: origin.address })
    //   if (!origin.address)
    //     return sendError(res, "Origin warehouse doesn't exist.")
    // }

    // if (typeof destination.address === "object") {
    //   let data = await locateAddress(
    //     destination.address.street +
    //     destination.address.ward +
    //     destination.address.district +
    //     destination.address.province
    //   )
    //   if (!data) return sendError(res, "Destination is not existing.")
    // } else {
    //   destination.address = await Warehouse.exists({
    //     _id: destination.address
    //   })
    //   if (!destination.address)
    //     return sendError(res, "Destination warehouse doesn't exist.")
    // }

    const updatedOrder = await Order.findByIdAndUpdate(order._id, { sender, receiver, product, cod, shipping })
    // await Product.deleteMany({ order: order._id });
    // products.forEach(async (product) => {
    //   const { name, quantity, unit, note } = product;
    //   await Product.create({ name, quantity, unit, note, order: order._id })
    // })
    return sendSuccess(res, "Update the order successfully.", updatedOrder)
  } catch (error) {
    console.log(error)
    return sendServerError(res)
  }
})


/**
 * @route put /api/order/feedlback/:orderId
 * @description put feedback of order
 * @access private
 */
orderRoute.put("/feedlback/:orderId", verifyToken, verifyCustomerOrAdmin, async (req, res) => {
  try {
    const staff = req.user.role.staff_type;
    if (!staff) {
      const orderId = req.params.orderId;
      const { content } = req.body;
      const order = await Order.findOne({ orderId });
      if (!order)
        return sendError(res, `the order ${orderId} does not exist.`);
      if (!content) return sendError(res, `the content does not exist.`);
      const staffId = order.staffconfirm;
      if (!staffId) return sendError(res, "StaffConfirm not in Order");
      const customer = await Customer.findById(order.customer);
      sendFeedback(staffId, content, customer._id);
      let add = { user: customer.name, content: content };
      let feedlback = [...order.feedback, add];
      await Order.findByIdAndUpdate(order._id, { feedback: feedlback });
      return sendSuccess(res, "Create Feeback by customer successfully");
    } else {
      const nameStaff = req.user.role.name;
      const orderId = req.params.orderId;
      const { content } = req.body;
      const order = await Order.findOne({ orderId });
      if (!order)
        return sendError(res, `the order ${orderId} does not exist.`);
      if (!content) return sendError(res, `the content does not exist.`);
      const customer = await Customer.findById(order.customer);
      sendtokenfeedbacktoCustomer(customer._id, content);
      let add = { user: nameStaff, content: content };
      let feedlback = [...order.feedback, add];
      await Order.findByIdAndUpdate(order._id, { feedback: feedlback });
      return sendSuccess(res, "Create Feeback by staff successfully");
    }
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
}
)

/**
 * @route get /api/order/:orderId/feedback
 * @description get feedback of order
 * @access private
 */
orderRoute.get("/:orderId/feedback", verifyToken, verifyCustomerOrAdmin,
  async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findOne({ orderId });
      if (!order)
        return sendError(res, `the orderID ${orderId} does not exist.`);
      const staff = req.user.role.staff_type;
      const user = await User.findOne({ role: order.customer });
      if (!staff) {
        if (req.user.role._id == order.customer)
          return sendSuccess(res, "get feedback successfully", order.feedback);
        else {
          return sendError(res, "forbidden");
        }
      } else
        return sendSuccess(res, "get feedback successfully", order.feedback);
    } catch (error) {
      return sendServerError(res);
    }
  }
);

/**
 * @route get /api/order/finance/:startDate/:endDate
 * @description get order of customer to financial management
 * @access private
 */
orderRoute.get("/finance/:startDate/:endDate", verifyToken, verifyCustomer, async (req, res) => {
  try {
    const customerID = req.user.role._id;
    const startDate = new Date(req.params.startDate);
    const endDate = new Date(req.params.endDate + "T23:59:59");
     if (startDate == 'Invalid Date' || endDate == 'Invalid Date') {
    return sendError(res, "Invalid Date")
  }

    const orderWaiting = { amount: 0, codFee: 0, shipFee: 0, percent: 0 };
    const orderInProgress = { amount: 0, codFee: 0, shipFee: 0, percent: 0 };
    const orderDispatching = { amount: 0, codFee: 0, shipFee: 0, percent: 0 };
    const orderDispatched = { amount: 0, codFee: 0, shipFee: 0, percent: 0 };
    const orderInReturn = { amount: 0, codFee: 0, shipFee: 0, percent: 0 };
    const orderReturnConfirmation = { amount: 0, codFee: 0, shipFee: 0, percent: 0 };
    const orderReturnSuccess = { amount: 0, codFee: 0, shipFee: 0, percent: 0 };
    const orderProblem = { amount: 0, codFee: 0, shipFee: 0, percent: 0 };
    const orderCanceled = { amount: 0, codFee: 0, shipFee: 0, percent: 0 };
    let totalCodFee = 0;
    let totalShipFee = 0;

    const Orders = await Order.find({
      customer: customerID,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    for (const order of Orders) {
      totalCodFee += +order.cod.fee;
      totalShipFee += +order.shipping.total_fee;
      if (order.timeline.slice(-1).status === ORDER_STATUS.waiting_for_pickup) {
        orderWaiting.amount++;
        orderWaiting.codFee += +order.cod.fee;
        orderWaiting.shipFee += +order.shipping.total_fee;
        orderWaiting.percent++;
      }
      if (order.timeline.slice(-1).status === ORDER_STATUS.in_progress) {
        orderInProgress.amount++;
        orderInProgress.codFee += +order.cod.fee;
        orderInProgress.shipFee += +order.shipping.total_fee;
        orderInProgress.percent++;
      }
      if (order.timeline.slice(-1).status === ORDER_STATUS.dispatching) {
        orderDispatching.amount++;
        orderDispatching.codFee += +order.cod.fee;
        orderDispatching.shipFee += +order.shipping.total_fee;
        orderDispatching.percent++;
      }
      if (order.timeline.slice(-1).status === ORDER_STATUS.dispatched) {
        orderDispatched.amount++;
        orderDispatched.codFee += +order.cod.fee;
        orderDispatched.shipFee += +order.shipping.total_fee;
        orderDispatched.percent++;
      }
      if (order.timeline.slice(-1).status === ORDER_STATUS.problem_order) {
        orderProblem.amount++;
        orderProblem.codFee += +order.cod.fee;
        orderProblem.shipFee += +order.shipping.total_fee;
        orderProblem.percent++;
      }
      if (order.timeline.slice(-1).status === ORDER_STATUS.in_return) {
        orderInReturn.amount++;
        orderInReturn.codFee += +order.cod.fee;
        orderInReturn.shipFee += +order.shipping.total_fee;
        orderInReturn.percent++;
      }
      if (order.timeline.slice(-1).status === ORDER_STATUS.return_confirmation) {
        orderReturnConfirmation.amount++;
        orderReturnConfirmation.codFee += +order.cod.fee;
        orderReturnConfirmation.shipFee += +order.shipping.total_fee;
        orderReturnConfirmation.percent++;
      }
      if (order.timeline.slice(-1).status === ORDER_STATUS.return_success) {
        orderReturnSuccess.amount++;
        orderReturnSuccess.codFee += +order.cod.fee;
        orderReturnSuccess.shipFee += +order.shipping.total_fee;
        orderReturnSuccess.percent++;
      }
      if (order.timeline.slice(-1).status === ORDER_STATUS.canceled) {
        orderCanceled.amount++;
        orderCanceled.codFee += +order.cod.fee;
        orderCanceled.shipFee += +order.shipping.total_fee;
        orderCanceled.percent++;
      }
    }

    orderWaiting.percent = parseFloat((orderWaiting.percent * 100 / Orders.length).toFixed(1));
    orderInProcess.percent = parseFloat((orderAccepted.percent * 100 / Orders.length).toFixed(1));
    orderDispatching.percent = parseFloat((orderProbablyProceed.percent * 100 / Orders.length).toFixed(1));
    orderDispatched.percent = parseFloat((orderProcessing.percent * 100 / Orders.length).toFixed(1));
    orderProblem.percent = parseFloat((orderCompleted.percent * 100 / Orders.length).toFixed(1));
    orderInReturn.percent = parseFloat((orderRefused.percent * 100 / Orders.length).toFixed(1));
    orderReturnConfirmation.percent = parseFloat((orderCancel.percent * 100 / Orders.length).toFixed(1));
    orderReturnSuccess.percent = parseFloat((orderPay.percent * 100 / Orders.length).toFixed(1));
    orderCanceled.percent = parseFloat((orderUnpay.percent * 100 / Orders.length).toFixed(1));

    return sendSuccess(res, 'Get list order successfully.',
      {
        totalOrder: Orders.length,
        totalCodFee: totalCodFee,
        totalShipFee: totalShipFee,
        waiting: orderWaiting,
        inProgress: orderInProgress,
        dispatching: orderDispatching,
        dispatched: orderDispatched,
        inReturn: orderInReturn,
        returnConfirmation: orderReturnConfirmation,
        returnSuccess: orderReturnSuccess,
        problem: orderProblem,
        canceled: orderCanceled
      }
    );
  }
  catch (error) {
    console.log(error);
    return sendServerError(res);
  }
});

/**
 * @route get /api/order/COD/:startDate/:endDate
 * @description get order's cod of customer by status
 * @access private
 */
orderRoute.get("/COD/:startDate/:endDate", verifyToken, verifyCustomer, async (req, res) => {
  const customerId = req.user.role._id;
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate + "T23:59:59");
  if (startDate == 'Invalid Date' || endDate == 'Invalid Date') {
    return sendError(res, "Invalid Date")
  }
  try {
    let waitingCOD = 0, collectedCOD = 0, collectedShipping = 0, waitingShipping = 0

    const order = await Order.find({
      customer: customerId,
      createdAt: { $gte: startDate, $lte: endDate }
    })
    order.forEach(order => {
      if ( order.cod.timeline.slice(-1).status === COD_STATUS.collected_cashier ){
        collectedCOD += +order.cod.cod
        collectedShipping += +order.shipping.total_fee
      } else if ( order.cod.timeline.slice(-1).status === COD_STATUS.waiting ) {
        waitingCOD += +order.cod.cod
        waitingShipping += +order.shipping.total_fee
      }
    })

    if (order.length === 0) {
      return sendSuccess(res, "order not found")
    }
    return sendSuccess(res, 'Get order successfully', { waitingCOD, waitingShipping, collectedCOD, collectedShipping })
  } catch (error) {
    console.error(error.message);
    return sendServerError(res);
  }
});
/**
 * @route get /api/order/endCOD/:startDate/:endDate
 * @description get order's cod of customer by status
 * @access private
 */
orderRoute.get("/endCOD/:startDate/:endDate", verifyToken, verifyCustomer, async (req, res) => {
  const customerId = req.user.role._id;
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate + "T23:59:59");
  if (startDate == 'Invalid Date' || endDate == 'Invalid Date') {
    return sendError(res, "Invalid Date")
  }
  try {
    let paidCOD = 0, fee = 0, controlMoney = 0
    const order = await Order.find({
      customer: customerId,
      updatedAt: { $gte: startDate, $lte: endDate }
    })
    order.forEach(order => {
      if ( order.cod.timeline.slice(-1) === COD_STATUS.paid ) {
        paidCOD += +order.cod.cod
        fee += +order.cod.fee
        controlMoney += +order.cod.control_money
      }
    })
    if (order.length === 0) {
      return sendSuccess(res, "order not found")
    }
    return sendSuccess(res, 'Get order successfully', { paidCOD, fee, controlMoney })
  } catch (error) {
    console.error(error.message);
    return sendServerError(res);
  }
});


export default orderRoute
