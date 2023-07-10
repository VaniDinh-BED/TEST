import express from "express"
import { sendError, sendServerError, sendSuccess, } from "../../helper/client.js"
import { updateOrderStatusValidate, updateOrderTrackingValidate } from "../../validation/order.js"
import { canChangeOrderStatus, genarateOrderID, genarateBillofLandingID, getOrderWithFilters } from "../../service/order.js"
import DeliveryService from "../../model/DeliveryService.js"
import Order from "../../model/Order.js"
import Product from "../../model/Product.js"
import { CASH_PAYMENT, COD_STATUS, ORDER_STATUS } from "../../constant.js"
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
 * @route POST /api/admin/order
 * @description admin create a new order
 * @access private
 */
orderAdminRoute.post('/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId
    const { sender, receiver, product, confirm_staff, pickUp_staff, delivery_staff, shipping } = req.body
    const orderId = await genarateOrderID()
    const bill_of_landing = await genarateBillofLandingID()
    const order = await Order.create({ orderId, customer: customerId, sender, receiver, product, cod: { cod: "0", fee: "0", control_money: "0" }, confirm_staff, pickUp_staff, delivery_staff, shipping: { id: bill_of_landing, ...shipping } })
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
 * @route PATCH /api/admin/order/scan/orderId
 * @description admin update tracking of an order by orderId
 * @access private
 */
orderAdminRoute.patch("/tracking/scan/:orderId", async (req, res) => {
  try {
    const errors = updateOrderTrackingValidate(req.body);
    if (errors) return sendError(res, errors);

    const staffId = req.user.role._id;

    const scan_body = {
      ...req.body,
      confirm_staff : staffId,
    }

    /* scan_body format after validation above
        scan_type :  requried  
        scan_code_time : requried
        confirm_staff : requried

        transportation : only SCAN_TYPE.RECIVED_ORDER not requried 

        driver : requried when scan_type = 
              SCAN_TYPE.SENDING_POSTOFFICE/SCAN_TYPE.RECEIVING_POSTOFFICE
              SCAN_TYPE.SENDING_WAREHOUSE/SCAN_TYPE.RECEIVING_WAREHOUSE
              
        warehouse : requried when scan_type = 
              SCAN_TYPE.SENDING_WAREHOUSE/SCAN_TYPE.RECEIVING_WAREHOUSE

        shipper : requried when scan_type = SCAN_TYPE.SENDING_POSTOFFICE
    */
    

    const { orderId } = req.params;

  
    const order = await Order.findOne({ orderId })
    if (!order) return sendError(res, "Order does not exist.", 404)

    // Update last tracking if have same scan_type and confirm_staff
    // else add new in tracking
    if (order.tracking == undefined) {
      order.tracking = [];
      order.tracking.push(scan_body);
    }
    else {
      const lenTrackings = order.tracking.length;
      if (lenTrackings == 0) {
        order.tracking.push(scan_body);
      } 
      else {
        if (order.tracking[lenTrackings - 1].scan_type == scan_body.scan_type && 
          order.tracking[lenTrackings - 1].confirm_staff == scan_body.confirm_staff){
            order.tracking[lenTrackings - 1] = scan_body;
          }
        else {
          order.tracking.push(scan_body);
        }
      }
    }
    
    await Order.findOneAndUpdate({orderId}, {tracking : order.tracking});

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

