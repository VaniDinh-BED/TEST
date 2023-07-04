import express from "express"
import { sendError, sendServerError, sendSuccess, } from "../../helper/client.js"
import { createOrderValidate, updateOrderStatusValidate } from "../../validation/order.js"
import { verifyAdmin, verifyCustomer, verifyToken } from "../../middleware/index.js"
import { canChangeOrderStatus, genarateOrderID, genarateBillofLandingID, getOrderWithFilters, generateRoute, handleOrderInfo } from "../../service/order.js"
import DeliveryService from "../../model/DeliveryService.js"
import Order from "../../model/Order.js"
import Customer from "../../model/Customer.js"
import Product from "../../model/Product.js"
import { locateAddress } from "../../service/location.js"
import Warehouse from "../../model/Warehouse.js"
import { CASH_PAYMENT, COD_STATUS, ORDER_STATUS } from "../../constant.js"
import { isServedByService } from "../../service/deliveryService.js"
import Department from "../../model/Department.js"
import CarFleet from "../../model/CarFleet.js"
import CompareReview from "../../model/CompareReview.js"
import { COMPARE_REVIEW_TYPE, SCAN_TYPE } from "../../constant.js"
import { getDateWhenEditSchedule } from "../../service/compareReview.js"
import { sendOrderMessageToCustomer } from "../../service/order.js"
import { handleGroupOrderByDeliveryStaff } from "../../service/order.js"
import Staff from "../../model/Staff.js"

const orderAdminRoute = express.Router();

/**
 * @route GET /api/admin/order
 * @description get list of order
 * @access private
 */

orderAdminRoute.get('/', async (req, res) => {
  try {
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0
    const page = req.query.page ? parseInt(req.query.page) : 0
    const { sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, orderStatus, codStatus, beginDateSend, endDateSend, beginDateReceive, endDateReceive, beginCollected, endCollected, cashPayment } = req.query
    const results = await getOrderWithFilters(pageSize, page, sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, orderStatus, codStatus, beginDateSend, endDateSend, beginDateReceive, endDateReceive, beginCollected, endCollected, cashPayment);
    if (results === "Order not found") {
      return sendError(res, results);
    }
    return sendSuccess(res, "Get order successfully", results);
  } catch (error) {
    console.error(error.message);
    return sendServerError(res);
  }

})

/**
 * @route GET /api/admin/order/total/:year/year
 * @description get a total price of year
 * @access private
 */
function handleSumTotalPrice(ordersOfProduct) {
  let totalPrice = 0;
  const priceInfo = []
  for (const product of ordersOfProduct) {
    if (!product.order) continue;
    totalPrice += product.quantity * product.order.total_price;
    priceInfo.push({ name: product.name, quantity: product.quantity, price: product.order.total_price, totalPrice: product.quantity * product.order.total_price, createdAt: product.order.createdAt })
  }
  return { totalPrice, priceInfo };
}
orderAdminRoute.get('/total/:year/year', async (req, res) => {
  try {
    const year = req.params.year * 1;
    const ordersOfProduct = await Product.find().populate({
      path: 'order',
      match: {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`)
        }
      }
    })
    const { totalPrice, priceInfo } = handleSumTotalPrice(ordersOfProduct)

    sendSuccess(res, 'total price in year', {
      totalPrice,
      priceInfo
    })
  } catch (error) {
    console.log(error)
    sendServerError(error);
  }
})

/**
 * @route GET /api/admin/order/total/:year/:month/month
 * @description get a total price of month in given year
 * @access private
 */
orderAdminRoute.get('/total/:year/:month/month', async (req, res) => {
  try {
    const year = req.params.year * 1;
    const month = req.params.month * 1;
    const ordersOfProduct = await Product.find().populate({
      path: 'order',
      match: {
        createdAt: {
          $gte: new Date(`${year}-${month}-01`),
          $lte: new Date(`${year}-${month}-31`)
        }
      }
    })
    const { totalPrice, priceInfo } = handleSumTotalPrice(ordersOfProduct);
    sendSuccess(res, 'total price in this month', {
      totalPrice,
      priceInfo
    })
  } catch (error) {
    console.log(error)
    sendServerError(error);
  }
})

/**
 * @route GET /api/admin/order/total/:year/quarter
 * @description get a total price of quarter in given year
 * @access private
 */
orderAdminRoute.get('/total/:year/:quarter/quarter', async (req, res) => {
  try {
    const year = req.params.year * 1;
    const quarter = req.params.quarter * 1;
    const ordersOfProduct = await Product.find().populate({
      path: 'order',
      match: {
        createdAt: {
          $gte: new Date(`${year}-${(quarter - 1) * 3 + 1}-01`),
          $lt: new Date(`${year}-${quarter * 3}-31`),
        }
      }
    })
    const { totalPrice, priceInfo } = handleSumTotalPrice(ordersOfProduct);
    sendSuccess(res, 'total price in this quarter', {
      totalPrice,
      priceInfo
    })
  } catch (error) {
    console.log(error)
    sendServerError(error);
  }
})

/**
 * @route GET /api/admin/order/total/:year/quarter
 * @description get a total price of week in given year
 * @access private
 */
orderAdminRoute.get('/total/:year/:week/week', async (req, res) => {
  try {
    const year = req.params.year * 1;
    const week = req.params.week * 1;
    const startDate = new Date(year, 0, 1); // Ngày đầu tiên của năm
    const endDate = new Date(year, 0, 1); // Ngày đầu tiên của năm
    endDate.setDate(startDate.getDate() + (week - 1) * 7 + 6); // Ngày cuối cùng của tuần
    const ordersOfProduct = await Product.find().populate({
      path: 'order',
      match: {
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        }
      }
    })
    const { totalPrice, priceInfo } = handleSumTotalPrice(ordersOfProduct);
    sendSuccess(res, 'total price in this quarter', {
      totalPrice,
      priceInfo
    })
    sendSuccess(res, `total price of week ${week} in year ${year} `, totalPriceOrderInWeek ? totalPriceOrderInWeek : 'Does not have order in this week')
  } catch (error) {
    console.log(error)
    sendServerError(error);
  }
})

/**
 * @route GET /api/admin/order/:orderId
 * @description get an order by orderId
 * @access private
 */
orderAdminRoute.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await handleOrderInfo(await Order.findOne({ orderId: orderId }).select('-__v'))
    if (order)
      return sendSuccess(res, 'get order successfully', order)
    return sendError(res, `The order ${orderId} does not exist.`)
  } catch (error) {
    console.log(error)
    return sendServerError(res)
  }
})

/**
 * @route GET /api/admin/order/profit/:Id
 * @description get profit report of each order by Id
 * @access private
 */
orderAdminRoute.get('/profit/:Id', async (req, res) => {
  try {
    const { Id } = req.params
    if (!Id.match(/^[0-9a-fA-F]{24}$/)) return sendError(res, `The order ${Id} does not exist.`)
    const isExit = await Order.exists({ _id: Id })
    if (!isExit) return sendError(res, "Order does not exist.")
    const order = await Order.findById(Id)
    if (order.status === 'completed' || order.status === 'pay' || order.status === 'unpay') {
      const tolalPrice = order.total_price
      const serviceId = order.service
      const services = await DeliveryService.findOne({ _id: serviceId })
      const profitService = services.profit
      const profit = Math.ceil(tolalPrice / ((100 + profitService) / 100) * (profitService / 100))
      return sendSuccess(res, 'Get profit of order successfully.', { Id, profit })
    }
    return sendError(res, 'The order has not been completed.')
  } catch (error) {
    console.log(error)
    return sendServerError(res)
  }
})

/**
 * @route GET /api/admin/order/customer/:customerId
 * @description get order of customer by admin role
 * @access private
 */
orderAdminRoute.get('/customer/:customerId', async (req, res) => {
  try {
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0
    const page = req.query.page ? parseInt(req.query.page) : 0
    const { sortBy } = req.query
    const { customerId } = await req.params
    const orders = await Promise.all((await Order.find({ customer: customerId })
      .skip(pageSize * page)
      .limit(pageSize)
      .sort(sortBy)
      .select('-__v')).map(async order => await handleOrderInfo(order)))
    const length = await Order.find({ customer: customerId }).count()
    return sendSuccess(res, 'get order successfully', { length, orders })
  } catch (error) {
    console.log(error)
    return sendServerError(res)
  }
})

/**
 * @route POST /api/admin/order
 * @description admin create a new order
 * @access private
 */
orderAdminRoute.post('/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId
    // const errors = createOrderValidate(req.body)
    // if (errors) return sendError(res, errors)

    // const customerId = await Customer.exists({ _id: req.params.customerId })
    // if (!customerId) return sendError(res, "Customer does not exist.")

    const { sender, receiver, product, confirm_staff, pickUp_staff, delivery_staff, shipping } = req.body

    // // check whether service is available
    // const serviceObj = await DeliveryService.findOne({ name: service })
    // if (!serviceObj) return sendError(res, "Delivery service is not available.")

    // let province = null
    // let endprovince = null;
    // // check whether address is real or not
    // if (typeof origin.address === 'object') {
    //   let data = await locateAddress(origin.address.street + origin.address.ward + origin.address.district + origin.address.province)
    //   if (!data) return sendError(res, 'Origin is not existing.')
    //   province = origin.address.province
    // }
    // else {
    //   const originWh = await Warehouse.findById(origin.address).select({ _id: 1, province: 1 })
    //   origin.address = originWh._id
    //   province = originWh.province
    //   if (!origin.address) return sendError(res, "Origin warehouse doesn't exist.")
    // }

    // if (typeof destination.address === 'object') {
    //   let data = await locateAddress(destination.address.street + destination.address.ward + destination.address.district + destination.address.province)
    //   if (!data) return sendError(res, 'Destination is not existing.')
    //   endprovince = destination.address.province
    // }
    // else {
    //   const destinationWh = await Warehouse.findById(destination.address).select({ _id: 1, province: 1 })
    //   destination.address = destinationWh._id
    //   endprovince = destinationWh.province
    //   if (!destination.address) return sendError(res, "Destination warehouse doesn't exist.")
    // }
    // if (!(await isServedByService(serviceObj, province, endprovince)))
    //   return sendError(res, "No available service serve this route.")

    const orderId = await genarateOrderID()
    const bill_of_landing = await genarateBillofLandingID()
    const order = await Order.create({ orderId, customer: customerId, sender, receiver, product, cod: { cod: "0", fee: "0", control_money: "0" }, confirm_staff, pickUp_staff, delivery_staff, shipping: { id: bill_of_landing, ...shipping } })

    // products.forEach(async product => {
    //   const { name, types, goods_value, other, quantity, weight, unit, note, service } = product
    //   await Product.create({ name, types, goods_value, other, quantity, weight, unit, note, service, order: order._id })
    // })

    return sendSuccess(res, 'Create new order successfully', { orderId: order.orderId })
  } catch (error) {
    console.log(error)
    return sendServerError(res)
  }
})

/**
 * @route PUT /api/admin/order/:orderId/status
 * @description update status order by orderId
 * @access private
 */
orderAdminRoute.put("/:orderId/status/change", async (req, res) => {
  try {
    const errors = updateOrderStatusValidate(req.body);
    if (errors) return sendError(res, errors);

    const { orderId } = req.params;
    const { status } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) return sendError(res, "Order does not exist.", 404);
    const curSta = order.timeline[order.timeline.length - 1].status;

    const canChange = await canChangeOrderStatus(order, status);

    if (canChange) {
      if (curSta === ORDER_STATUS.in_progress) {
        const orderWithNewStatus = await Order.findOneAndUpdate(
          { orderId },
          {
            $push:
            {
              timeline: {
                status: status
              }
            },
          },
          { new: true }
        );
        sendOrderMessageToCustomer(order.orderId, "Đơn hàng đã được lấy thành công và chuyển đến kho phân loại");
        if (orderWithNewStatus) {
          let _date = await getDateWhenEditSchedule(COMPARE_REVIEW_TYPE.DEFAULT);
          await CompareReview.create({
            customer: orderWithNewStatus.customer,
            order: orderWithNewStatus._id,
            selected_date: _date,
          });
          if (status === ORDER_STATUS.dispatching) {
            sendOrderMessageToCustomer(order.orderId, "Đơn hàng đã được xác nhận thành công");
          }
          return sendSuccess(res, "Change status of the order successfully.", {
            ...(await handleOrderInfo(orderWithNewStatus)),
            status,
          });
        }
      } else if (status === ORDER_STATUS.dispatched) {
        const orderWithNewStatus = await Order.findOneAndUpdate(
          { orderId: orderId },
          {
            $push:
            {
              timeline: {
                status: status
              },
              'cod.timeline': {
                status: COD_STATUS.collected_shipper
              }
            }
          },
          { new: true }
        );
        return sendSuccess(res, "Change status of the order successfully.", orderWithNewStatus);
      } else {
        const orderWithNewStatus = await Order.findOneAndUpdate(
          { orderId: orderId },
          {
            $push:
            {
              timeline: {
                status: status
              }
            }
          },
          { new: true }
        );
        if (orderWithNewStatus) {
          if (status === ORDER_STATUS.in_return) {
            sendOrderMessageToCustomer(order.orderId, "Yêu cầu trả hàng của bạn đã được gửi đi")
          }
          if (status === ORDER_STATUS.return_confirmation) {
            sendOrderMessageToCustomer(order.orderId, "Yêu cầu trả hàng của bạn đã được xác nhận thành công")
          }
          if (status === ORDER_STATUS.return_success) {
            sendOrderMessageToCustomer(order.orderId, "Đơn hàng đã được hoàn trả thành công")
          }
          if (status === ORDER_STATUS.problem_order) {
            sendOrderMessageToCustomer(order.orderId, "Đơn hàng đã xảy ra sự cố trong quá trình vận chuyển")
          }
          if (status === ORDER_STATUS.canceled) {
            sendOrderMessageToCustomer(order.orderId, "Đơn hàng đã bị huỷ")
          }
          return sendSuccess(res, "Change status of the order successfully.", {
            ...(await handleOrderInfo(orderWithNewStatus)),
            status,
          });
        }
        return sendSuccess(res, "updated order status", orderWithNewStatus);
      }
      return sendSuccess(res, "Change status of the order successfully.");
    }
    return sendError(res, "Can not change the status of this order.");
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
});

/**
 * @route PUT /api/admin/order/:orderId/route
 * @description update route of an order by orderId
 * @access private
 */
orderAdminRoute.put("/:orderId/route", async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await handleOrderInfo(await Order.findOne({ orderId }));
    if (!order) return sendError(res, "Order does not exist.", 404);
    const route = await generateRoute(
      { _id: order.service },
      order.origin,
      order.destination
    );
    await Order.findOneAndUpdate({ orderId }, { route });
    const returnRoute = (await Order.findOne({ orderId }).populate("route"))
      .route;
    return sendSuccess(
      res,
      "Genarate transportation route successfully.",
      returnRoute
    );
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
});

/**
 * @route PUT /api/admin/order/tracking/orderId
 * @description update tracking of an order by orderId
 * @access private
 */
orderAdminRoute.put("/tracking/:orderId", async (req, res) => {
  try {
    const { orderId } = await req.params;
    const area = await req.body
    const order = await Order.findOne({ orderId })
    if (!order) return sendError(res, "Order does not exist.", 404)
    order.tracking.push(area)
    await Order.findOneAndUpdate({ orderId }, { tracking: order.tracking });
    return sendSuccess(
      res, "successfully.", order
    )
  } catch (error) {
    console.log(error);
    return sendServerError(res)
  }
})

/**
 * @route PUT /api/admin/order/COD/orderId
 * @description update cod of an order by orderId
 * @access private
 */
orderAdminRoute.put("/COD/:orderId", async (req, res) => {
  try {
    const { orderId } = await req.params
    const isExist = await Order.exists({ orderId: orderId })
    if (isExist) {
      const cod = await req.body.cod
      await Order.findOneAndUpdate({ orderId }, { cod: cod });
      return sendSuccess(res, "update cod successfully.")
    }
    return sendError(res, "update cod failed.")
  } catch (error) {
    console.log(error);
    return sendServerError(res)
  }
})

/**
 * @route GET /api/admin/order/list-order/:customerId
 * @description update route of an order by orderId
 * @access private
 */
orderAdminRoute.get("/list-order/:customerId", async (req, res) => {
  let customerId = req.params.customerId;

  try {
    const ordersOfCustomer = await Customer.findOne({
      _id: customerId,
    }).populate("orders");
    if (!ordersOfCustomer) {
      return sendError(res, "Customer does not exist.");
    }

    if (ordersOfCustomer.orders.length < 1) {
      return sendError(res, "Customer does not have any order.");
    }
    return sendSuccess(res, undefined, {
      ordersByCustomer: ordersOfCustomer.orders,
    });
  } catch (err) {
    console.log(err);
    sendServerError(res);
  }
});

/**
 * @route GET /api/admin/order/history-order/:customerId
 * @description update route of an order by orderId
 * @access private
 */
orderAdminRoute.get("/history-order/:customerId", async (req, res) => {
  let customerId = req.params.customerId;

  try {
    const ordersOfCustomer = await Customer.findOne({
      _id: customerId,
    }).populate({ path: 'orders', select: 'orderId totalPrice status createdAt' });

    if (!ordersOfCustomer) {
      return sendError(res, "Customer does not exist.");
    }
    if (ordersOfCustomer?.orders?.length < 1) {
      return sendError(res, "Customer does not have any order.");
    }
    return sendSuccess(res, 'Success', {
      totalOrders: ordersOfCustomer?.orders?.length,
      historyOrders: ordersOfCustomer.orders,
    })
  } catch (err) {
    console.log(err);
    sendServerError(res);
  }
});

/**
 * @route PATCH /api/admin/order/tracking/scan-sending/orderId
 * @description admin update tracking of an order by orderId
 * @access private
 */
orderAdminRoute.patch("/tracking/scan-sending/:orderId", async (req, res) => {
  try {
    const staffId = req.user.role._id;
    const {
      scan_code_time,
      transportion,
      post_office_sending,
      warehouse_sending, } = req.body;

    const { orderId } = req.params;

    const scan_body = {
      types: SCAN_TYPE.SENDING,
      scan_code_time: scan_code_time,
      transportion: transportion,
      post_office_sending: post_office_sending,
      warehouse_sending: warehouse_sending,
      staff_scan: staffId,
    };

    const order = await Order.findOne({ orderId })
    if (!order) return sendError(res, "Order does not exist.", 404)
    order.tracking.push(scan_body)

    await Order.findOneAndUpdate({ orderId }, { tracking: order.tracking });
    return sendSuccess(
      res, "successfully.", order
    )
  } catch (error) {
    console.log(error);
    return sendServerError(res)
  }
})


/**
 * @route PATCH /api/admin/order/tracking/scan-incoming/orderId
 * @description admin update tracking of an order by orderId
 * @access private
 */
orderAdminRoute.patch("/tracking/scan-incoming/:orderId", async (req, res) => {
  try {
    const staffId = req.user.role._id;
    const {
      scan_code_time,
      transportion, } = req.body;

    const { orderId } = req.params;

    const scan_body = {
      types: SCAN_TYPE.INCOMING,
      scan_code_time: scan_code_time,
      transportion: transportion,
      staff_scan: staffId,
    };

    const order = await Order.findOne({ orderId })
    if (!order) return sendError(res, "Order does not exist.", 404)
    order.tracking.push(scan_body)

    await Order.findOneAndUpdate({ orderId }, { tracking: order.tracking });
    return sendSuccess(
      res, "successfully.", order
    )
  } catch (error) {
    console.log(error);
    return sendServerError(res)
  }
})
/**
* @route PUT /api/admin/order/finance/cod/collecting
* @description get cod not collected
* @access private
*/
orderAdminRoute.get("/finance/cod/collecting", async (req, res) => {
  try {
    const confirmStaffName = req.user.role.name;
    const _orderStatus = ORDER_STATUS.dispatched;
    const _codStatus = COD_STATUS.collected_shipper;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const { sortBy, keyword, deliveryStaff, department, carFleet, customer, beginDateSend, endDateSend, beginDateReceive, endDateReceive, cashPayment } = req.query;
    let { confirmStaff, orderStatus, codStatus } = req.query;
    confirmStaff = confirmStaffName;
    orderStatus = _orderStatus;
    codStatus = _codStatus;
    const results = await getOrderWithFilters(pageSize, page, sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, orderStatus, codStatus, beginDateSend, endDateSend, beginDateReceive, endDateReceive, cashPayment)
      .then(result => {
        if (result === "Order not found") {
          return sendError(res, "COD not found");
        } else {
          const data = result.reduce((acc, item) => {
            const { delivery_staff, cod, shipping, cash_payment } = item;
            if (!acc[delivery_staff._id]) {
              acc[delivery_staff._id] = {
                staff: delivery_staff._id,
                countPP: cash_payment === CASH_PAYMENT.PP_CASH ? 1 : 0,
                moneyPP: cash_payment === CASH_PAYMENT.PP_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
                countCC: cash_payment === CASH_PAYMENT.CC_CASH ? 1 : 0,
                moneyCC: cash_payment === CASH_PAYMENT.CC_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
                cod: cod.cod ? parseInt(cod.cod) : 0,
                total: shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0,
              };
            } else {
              acc[delivery_staff._id].countPP += cash_payment === CASH_PAYMENT.PP_CASH ? 1 : 0;
              acc[delivery_staff._id].moneyPP += cash_payment === CASH_PAYMENT.PP_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
                acc[delivery_staff._id].countCC += cash_payment === CASH_PAYMENT.CC_CASH ? 1 : 0;
              acc[delivery_staff._id].moneyCC += cash_payment === CASH_PAYMENT.CC_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
                acc[delivery_staff._id].cod += parseInt(cod.cod)
              acc[delivery_staff._id].total += shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0
            }
            return acc;
          }, {});
          const dataArray = Object.keys(data).map(async (key) => {
            const deliveryStaff = await Staff.findById(key);
            return {
              ...data[key],
              staff: deliveryStaff ? deliveryStaff : key,
            };
          });
          Promise.all(dataArray)
            .then((resolvedData) => {
              return sendSuccess(res, "Get orders by delivery staff successfully: ", resolvedData);
            })
            .catch((error) => {
              return sendError(res, "Error: " + error);
            });
        }
      });
  } catch (error) {
    return sendServerError(res, error);
  }
}
);

/**
* @route PUT /api/admin/finance/cod/collecting
* @description update cod status in order by cod collection
* @access private
*/
orderAdminRoute.put('/finance/cod/collecting', async (req, res) => {
  try {
    const confirmStaffName = req.user.role.name;
    const _orderStatus = ORDER_STATUS.dispatched;
    const _codStatus = COD_STATUS.collected_shipper;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const { sortBy, keyword, deliveryStaff, department, carFleet, customer, beginDateSend, endDateSend, beginDateReceive, endDateReceive, cashPayment } = req.query;
    let { confirmStaff, orderStatus, codStatus } = req.query;
    confirmStaff = confirmStaffName;
    orderStatus = _orderStatus;
    codStatus = _codStatus;
    const results = await getOrderWithFilters(pageSize, page, sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, orderStatus, codStatus, beginDateSend, endDateSend, beginDateReceive, endDateReceive, cashPayment)
      .then(result => {
        if (result === "Order not found") {
          return sendError(res, "COD not found");
        } else {
          result.map(async (item) => {
            const newCodStatus = await Order.findByIdAndUpdate(item._id,
              {
                $push:
                {
                  'cod.timeline': {
                    status: COD_STATUS.collected_cashier
                  }
                }
              },
              { new: true })
          });
          return sendSuccess(res, "Collected COD successfully");
        }
      });
  } catch (error) {
    return sendServerError(res, error);
  }
});

/**
* @route GET /api/admin/order/finance/cod/collected
* @description get all cod collected
* @access private
*/
orderAdminRoute.get('/finance/cod/collected', async (req, res) => {
  try {
    const _orderStatus = ORDER_STATUS.dispatched;
    const _codStatus = COD_STATUS.collected_cashier;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const { sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, beginDateSend, endDateSend, beginDateReceive, endDateReceive, beginCollected, endCollected, cashPayment } = req.query;
    let { orderStatus, codStatus } = req.query;
    orderStatus = _orderStatus;
    codStatus = _codStatus;
    const results = await getOrderWithFilters(pageSize, page, sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, orderStatus, codStatus, beginDateSend, endDateSend, beginDateReceive, endDateReceive, beginCollected, endCollected, cashPayment)
      .then(result => {
        if (result === "Order not found") {
          return sendError(res, "COD not found");
        } else {
          const data = result.reduce((acc, item) => {
            const { delivery_staff, confirm_staff, lastTimeLineCodStatus, cod, shipping, cash_payment } = item;
            if (!acc[delivery_staff._id]) {
              acc[delivery_staff._id] = {
                time: lastTimeLineCodStatus.time,
                staff: delivery_staff._id,
                collectedBy: confirm_staff._id,
                money: shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0,
                cashPayment: [cash_payment],
                cod: cod.cod ? parseInt(cod.cod) : 0,
                serial: "",
              };
            } else {
              acc[delivery_staff._id].cashPayment.push(cash_payment);
              acc[delivery_staff._id].cashPayment = [...new Set(acc[delivery_staff._id].cashPayment)],
                acc[delivery_staff._id].money += shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0,
                acc[delivery_staff._id].cod += parseInt(cod.cod)
            }
            return acc;
          }, {});
          const dataArray = Object.keys(data).map(async (key) => {
            const deliveryStaff = await Staff.findById(data[key].staff);
            const confirmStaff = await Staff.findById(data[key].collectedBy);
            return {
              ...data[key],
              delivery_staff: deliveryStaff ? deliveryStaff : key,
              confirm_staff: confirmStaff ? confirmStaff : key
            };
          });
          Promise.all(dataArray)
            .then((resolvedData) => {
              return sendSuccess(res, "Get orders by delivery staff successfully: ", resolvedData);
            })
            .catch((error) => {
              return sendError(res, "Error: " + error);
            });
        }
      });
  } catch (error) {
    return sendServerError(res, error);
  }
})

/**
* @route GET /api/admin/order/finance/cod/detail
* @description get detail cod collected by a delivery staff
* @access private
*/
orderAdminRoute.get('/finance/cod/collected/detail', async (req, res) => {
  try {
    const _orderStatus = ORDER_STATUS.dispatched;
    const _codStatus = COD_STATUS.collected_cashier;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const { sortBy, keyword, deliveryStaff, confirmStaff, department, carFleet, customer, beginDateSend, endDateSend, beginDateReceive, endDateReceive, beginCollected, endCollected, cashPayment } = req.query;
    let { orderStatus, codStatus } = req.query;
    orderStatus = _orderStatus;
    codStatus = _codStatus;
    const results = await getOrderWithFilters(pageSize, page, sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, orderStatus, codStatus, beginDateSend, endDateSend, beginDateReceive, endDateReceive, beginCollected, endCollected, cashPayment)
      .then(async (result) => {
        if (result === "Order not found") {
          return sendError(res, "COD not found");
        } else {
          var groupedObjects = {};
          result.forEach(function (obj) {
            var deliveryStaff = obj.delivery_staff;
            if (groupedObjects.hasOwnProperty(deliveryStaff)) {
              groupedObjects[deliveryStaff].push(obj);
            } else {
              groupedObjects[deliveryStaff] = [obj];
            }
          });
          const resultArray = [];
          for (var staff in groupedObjects) {
            const obj = groupedObjects[staff];
            const newData = await handleGroupOrderByDeliveryStaff(obj);
            resultArray.push(newData);
          }
          Promise.all(resultArray)
            .then((resolvedData) => {
              return sendSuccess(res, "Get orders by delivery staff successfully: ", resolvedData);
            })
            .catch((error) => {
              return sendError(res, "Error: " + error);
            });
        }
      });
  } catch (error) {
    return sendServerError(res, error);
  }
});

/**
* @route GET /api/admin/order/finance/cod
* @description get all cod by date
* @access private
*/
orderAdminRoute.get('/finance/cod', async (req, res) => {
  try {
    const _orderStatus = ORDER_STATUS.dispatched;
    const _codStatus1 = COD_STATUS.collected_shipper;
    const _codStatus2 = COD_STATUS.collected_cashier;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const { sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, beginDateSend, endDateSend, beginDateReceive, endDateReceive, cashPayment } = req.query;
    let { orderStatus } = req.query;
    orderStatus = _orderStatus;
    const promise1 = getOrderWithFilters(pageSize, page, sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, orderStatus, _codStatus1, beginDateSend, endDateSend, beginDateReceive, endDateReceive, cashPayment);
    const promise2 = getOrderWithFilters(pageSize, page, sortBy, keyword, confirmStaff, deliveryStaff, department, carFleet, customer, orderStatus, _codStatus2, beginDateSend, endDateSend, beginDateReceive, endDateReceive, cashPayment);
    const [result1, result2] = await Promise.all([promise1, promise2]);
    const results = [...result1, ...result2];
    if (results.length == 0) return sendError(res, "COD not found");
    const data = results.reduce((acc, item) => {
      const { delivery_staff, lastTimeLineCodStatus, cod, shipping, cash_payment } = item;
      if (!acc[delivery_staff._id]) {
        acc[delivery_staff._id] = {
          deliveryStaff: delivery_staff._id,
          moneyPP: cash_payment === CASH_PAYMENT.PP_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
          moneyCC: cash_payment === CASH_PAYMENT.CC_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
          cod: parseInt(cod.cod),
          total: (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) + parseInt(cod.cod),
          moneyCollected: lastTimeLineCodStatus.status === COD_STATUS.collected_cashier ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
          notCollected: lastTimeLineCodStatus.status === COD_STATUS.collected_shipper ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) + parseInt(cod.cod) : 0,
          count: 1,
          codCollected: lastTimeLineCodStatus.status === COD_STATUS.collected_cashier ? parseInt(cod.cod) : 0
        };
      } else {
        acc[delivery_staff._id].moneyPP += cash_payment === CASH_PAYMENT.PP_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
        acc[delivery_staff._id].moneyCC += cash_payment === CASH_PAYMENT.CC_CASH ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
        acc[delivery_staff._id].cod += parseInt(cod.cod),
        acc[delivery_staff._id].total += (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) + parseInt(cod.cod),
        acc[delivery_staff._id].moneyCollected += lastTimeLineCodStatus.status === COD_STATUS.collected_cashier ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) : 0,
        acc[delivery_staff._id].notCollected += lastTimeLineCodStatus.status === COD_STATUS.collected_shipper ? (shipping.total_amount_after_tax_and_discount ? parseInt(shipping.total_amount_after_tax_and_discount) : 0) + parseInt(cod.cod) : 0,
        acc[delivery_staff._id].count += 1,
        acc[delivery_staff._id].codCollected += lastTimeLineCodStatus.status === COD_STATUS.collected_cashier ? parseInt(cod.cod) : 0
      }
      return acc;
    }, {});
    const dataArray = Object.keys(data).map(async (key) => {
      const deliveryStaff = await Staff.findById(key);
      return {
        ...data[key],
        deliveryStaff: deliveryStaff ? deliveryStaff : key,
      };
    });
    Promise.all(dataArray)
      .then((resolvedData) => {
        console.log("get dataArray: ", resolvedData);
        const moneyData = []
        resolvedData.map(({ deliveryStaff, ...rest }) => {
          moneyData.push(rest);
        });
        const totalData = moneyData.reduce((acc, item) => {
          acc.moneyPP += item.moneyPP;
          acc.moneyCC += item.moneyCC;
          acc.cod += item.cod;
          acc.total += item.total;
          acc.moneyCollected += item.moneyCollected;
          acc.notCollected += item.notCollected;
          return acc;
        }, {
          moneyPP: 0,
          moneyCC: 0,
          cod: 0,
          total: 0,
          moneyCollected: 0,
          notCollected: 0,
        })
        return sendSuccess(res, "Get orders by delivery staff successfully: ", { resolvedData, totalData });
      })
      .catch((error) => {
        return sendError(res, "Error: " + error);
      });
  } catch (error) {
    return sendServerError(res, error);
  }
});


export default orderAdminRoute

