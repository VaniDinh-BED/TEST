import express from "express"
import { sendServerError, sendSuccess, sendError } from "../helper/client.js"
import Blog from "../model/Blog.js";

const blogRoute = express.Router()

/**
 * @route GET api/blog
 * @description  get all blog
 * @access public
 */
blogRoute.get("/", async(req, res) => {
    try {
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0
        const page = req.query.page ? parseInt(req.query.page) : 0
        const { keyword, sortBy, title, description, content, categorys } = req.query
        let query = {}
        let keywordList = keyword 
            ? {
                $or: [
                    { title: { $regex: keyword, $options: "i" } },
                    { description: { $regex: keyword, $options: "i" } },
                    { content: { $regex:keyword, $options: "i" } },
                    { categorys: { $regex: keyword, $options: "i" } }
                ]
            } : {}
        if (title) {
            query.title = title
        }
        if (description) {
            query.description = description
        }
        if (content) {
            query.content = content
        }
        if (categorys) {
            query.categorys = categorys
        }
        const length = await Blog.find({ $and: [query, keywordList] }).count()
        const blog = await Blog.find({ $and: [query, keywordList] })
            .limit(pageSize)
            .skip(pageSize * page)
            .sort(`${sortBy}`)
        if(blog){
            return sendSuccess(res, 'Get blog successfully.', { length, blog })
        }
        return sendError(res, 'Get blog failed.')
    } catch (error) {
        console.log(error)
        return sendServerError(res)
    }
})

/**
 * @route GET api/blog/:blogID
 * @description get blog by id
 * @access public
 */
blogRoute.get("/:blogID", async(req, res) => {
    try {
        const { blogID } = req.params
        if(!blogID.match(/^[0-9a-fA-F]{24}$/)){
            return sendError(res, 'ID blog does not existed.')
        }
        const blog = await Blog.findById({ _id: blogID })
        if(!blog) return sendError(res, 'ID blog does not existed.')
        return sendSuccess(res, 'Get a blog successfully.', blog)
    } catch (error) {
        console.log(error)
        return sendServerError(res)
    }
})

export default blogRoute