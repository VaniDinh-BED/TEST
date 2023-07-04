import mongoose from "mongoose"
const { Schema } = mongoose
import { SUPPLIER, SUPPLIER_STATUS } from "../constant.js";

const WarehousrInputSchema = new Schema(
    {
        product_name: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        unit_price: {
            type: Number,
            required: true
        },
        supplier: {
            type: String,
            enum: Object.values(SUPPLIER)
        },
        import_date: {
            type: Date,
            default: Date.now()
        },
        import_by: {
            type: Schema.Types.ObjectId,
            ref: 'staffs',
            required: true
        },
        status: {
            type: String,
            enum: Object.values(SUPPLIER_STATUS),
            default: SUPPLIER_STATUS.unpay,
            required: true
        },
        note: {
            type: String
        },
        other_costs: {
            arise_cost: {
                type: Number,
                required: true
            },
            payment_overdue_cost: {
                type: Number,
                required: true
            },
            interest_cost: {
                type: Number,
                required: true
            }
        }
    },
    { timestamps: true }
)

export default mongoose.model('warehouse_input', WarehousrInputSchema)