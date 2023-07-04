import mongoose from "mongoose"
import { ISSUES_TYPE, ORDER_STATUS, PICK_UP_AT } from "../constant.js"
const { Schema} = mongoose

const OrderIssueSchema = new Schema({
    orderId: {
        type: mongoose.Schema.Types.String,
        ref: 'orders',
        required: true,
    },
    issueType: {
        type: String,
        enum: Object.values(ISSUES_TYPE),
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
}, {
    timestamps: true
});

export default mongoose.model('orderIssues', OrderIssueSchema)