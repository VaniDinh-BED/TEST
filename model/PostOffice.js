import mongoose from "mongoose"
const { Schema } = mongoose

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
        },
        inventory_number: {
            type: String,
        },
        inventory_weight: {
            type: String,
        },
        inventory_carrying_cost: {
            type: String,
        },
        inventory_COD: {
            type: String,
        },

    },
    {
        timestamps: true,
    }
)


export default mongoose.model('post_office', PostOfficeSchema)