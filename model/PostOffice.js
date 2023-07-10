import mongoose from "mongoose"
const { Schema } = mongoose
import Order from "./Order.js"
const PostOfficeSchema = new Schema(
    {
        // format : AAABBCCC
        // AAA is province code
        // BB is district code
        // CCC is the CCC th post office in AAA provice, BB district
        code: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        province: {
            type: String,
            required: true
        },
        district: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true }
    }
)
PostOfficeSchema.virtual('inventory_number').get(async function () {

    let data = await Order.find({ tracking })
    console.log("🚀 ~ file: PostOffice.js:37 ~ data:", data)
    return data ? 'null' : "fail"
})
PostOfficeSchema.virtual('inventory_weight').get(() => {
    return Date.now()
})
PostOfficeSchema.virtual('inventory_carrying_cost').get(() => {
    return Date.now()
})
PostOfficeSchema.virtual('inventory_COD').get(() => {
    return Date.now()
})

export default mongoose.model('post_office', PostOfficeSchema)