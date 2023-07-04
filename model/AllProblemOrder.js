import mongoose from "mongoose"
import { TypeOfProblem, TypeOfStatusProblem } from "../constant.js"
const { Schema} = mongoose

const AllProblemOrderSchema = new Schema({
    orderId: {
        type: mongoose.Schema.Types.String,
        ref: 'orders',
        required: true,
    },
    customerId: {
        type: mongoose.Schema.Types.String,
        ref: 'customers',
        required: true,
    },
    staffconfirm: {
        type: mongoose.Schema.Types.String,
        ref: 'Users',
        required: true,
    },
    issueType: {
        type: String,
        enum: Object.values(TypeOfProblem),
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(TypeOfStatusProblem),
        required: true,
    },
    sender: {
        type: {
            name: {
                type: String,
                required: true
            },
            phone: {
                type: String,
                required: true
            }
        },
        required: true
    },
    receiver: {
        type: {
            name: {
                type: String,
                required: true
            },
            phone: {
                type: String,
                required: true
            }
        },
        required: true
    },
    isViewed: {
        type: Boolean,
        default: false,
    },
    products: [
        {
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref:'products'
        },
        name: {
            type: String,
            required: true
        }
        }
    ]
}, {
    timestamps: true
});

export default mongoose.model('allProblemOrder', AllProblemOrderSchema)