import mongoose from "mongoose"
import { STAFF, POSITION } from "../constant.js"
const { Schema } = mongoose

const StaffSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },
        code: {
            type: String,
            required: true
        },
        serial_number_of_the_shipping_manifest: {
            type: String,
        },
        address: {
            type: String,
            default: null
        },
        staff_type: {
            type: String,
            enum: Object.values(STAFF),
            required: true,
            default: STAFF.STAFF
        },
        staff_position: {
            type: String,
            enum: Object.values(POSITION),
            default: POSITION.INTERN
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'department',
            default: null
        },
        car_fleet: {
            type: Schema.Types.ObjectId,
            ref: 'car_fleets',
            default: null
        }
    },
    { timestamps: true }
)

export default mongoose.model('staffs', StaffSchema)