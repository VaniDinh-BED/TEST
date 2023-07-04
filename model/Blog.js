import mongoose from "mongoose"
import { BLOG_CATEGORY } from "../constant.js"
const { Schema } = mongoose

const BlogSchema = new Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: new Date()
        },
        categorys: {
            type: String,
            enum: Object.values(BLOG_CATEGORY),
            default: BLOG_CATEGORY.INDUSTRY_NEWS
        },
        picture: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
)

export default mongoose.model('blogs', BlogSchema)
