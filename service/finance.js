import { CASH_PAYMENT } from "../constant.js";
import Staff from "../model/Staff.js";

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

