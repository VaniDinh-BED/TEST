import express from "express"
import { sendError, sendServerError, sendSuccess } from "../../helper/client.js"
import Order from "../../model/Order.js";
import { CASH_PAYMENT, COD_STATUS, ORDER_STATUS } from "../../constant.js";
import Staff from "../../model/Staff.js";
import Error from "../../helper/error.js";
import { getOrderWithFilters } from "../../service/order.js";
import { handleGroupOrderByDeliveryStaff } from "../../service/finance.js";

const financeAdminRoute = express.Router();

/**
 * @route GET /api/admin/finance/cod/collecting
 * @description get all cod not collected
 * @access private
 */
financeAdminRoute.get("/cod/collecting", async (req, res) => {
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
 * @route PUT /api/admin/finance/collecting
 * @description update cod status in order by cod collection
 * @access private
 */
financeAdminRoute.put('/cod/collecting', async (req, res) => {
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
 * @route GET /api/admin/finance/cod/collected
 * @description get all cod collected
 * @access private
 */
financeAdminRoute.get('/cod/collected', async (req, res) => {
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
 * @route GET /api/admin/finance/cod/detail
 * @description get detail cod collected by a delivery staff
 * @access private
 */
financeAdminRoute.get('/cod/collected/detail', async (req, res) => {
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
 * @route GET /api/admin/finance/cod/
 * @description get all cod by date
 * @access private
 */
financeAdminRoute.get('/cod', async (req, res) => {
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
                    acc[delivery_staff._id].cod += parseInt(cod.cod)
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

export default financeAdminRoute