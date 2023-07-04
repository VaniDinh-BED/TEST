import Error from "../helper/error.js"

export const warehouseInputValidate = data => {
    const error = new Error()
    error.isRequired(data.product_name, 'product_name')
    .isRequired(data.quantity, 'quantity')
    .isRequired(data.unit_price, 'ununit_priceit')
    .isRequired(data.supplier , 'supplier')
    .isRequired(data.other_costs.arise_cost, 'arise_cost')
    .isRequired(data.other_costs.payment_overdue_cost, 'payment_overdue_cost')
    .isRequired(data.other_costs.interest_cost, 'interest_cost')
    return error.get()
}