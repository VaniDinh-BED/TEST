import mongoose from "mongoose"
import { TAX_TYPE } from "../constant.js"
const { Schema } = mongoose

const TaxSchema = new Schema(
    {
        name: {
            type: String,
            enum: Object.values(TAX_TYPE),
            required: true,
            default: TAX_TYPE.COMPANY_INCOME
        },
        cost: {
            type: String,
            required: true
        },
        note: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
)

export default mongoose.model('tax', TaxSchema)