import express from "express"
import { sendError, sendServerError, sendSuccess } from "../../helper/client.js"
import Blog from "../../model/Blog.js"
import { createLogoDir } from "../../middleware/index.js"
import { handleFilePath, uploadResources } from "../../constant.js"
import { createBlogValidate } from "../../validation/blog.js"
import { unlinkSync } from "fs"

const blogAdminRoute = express.Router()

/**
 * @route POST api/admin/blog
 * @description create new blog
 * @access private
 */
blogAdminRoute.post("/", 
    createLogoDir,
    uploadResources.single('picture'),
    async(req, res) => {
    try {
        const picture = handleFilePath(req.file)    
        const { title, description, content, categorys } = req.body
        const error = createBlogValidate(req.body, { picture: req.file })
        if (error) return sendError(res, error)
        const blog = await Blog.create({
            title: title,
            description: description,
            content: content,
            categorys: categorys,
            picture: picture
        })
        return sendSuccess(res, 'Create new blog successfully.', blog)
    } catch (error) {
        console.log(error)
        if (req.picture) unlinkSync(req.picture.path)
        return sendServerError(res)
    }
})

/**
 * @route PUT api/admin/blog/:blogID
 * @description update a blog by id
 * @access private
 */
blogAdminRoute.put("/:blogID", 
    createLogoDir,
    uploadResources.single('picture'),
    async(req, res) => {
    try {
        const { blogID } = req.params
        const picture = handleFilePath(req.file)
        if(!blogID.match(/^[0-9a-fA-F]{24}$/)){
            return sendError(res, 'ID blog does not existed.')
        }
        const blog = await Blog.findById({ _id: blogID })
        if(!blog) return sendError(res, 'ID blog does not existed.')
        const { title, description, content, categorys } = req.body
        if (!title && !description && !content && !categorys && !req.file) {
            return sendError(res, 'Please enter the files that need updating.')
        }
        if(blog){
            const updateFields = {
                title: title,
                description: description,
                content: content,
                categorys: categorys
            }
            if (picture) {
                updateFields.picture = picture
            }
            await Blog.findByIdAndUpdate(blogID, updateFields)
            const result = {
                _id: blogID,
                title: title,
                description: description,
                content: content,
                categorys: categorys
            }
            if (picture !== null) {
                result.picture = picture
            }
            return sendSuccess(res, 'Update a blog successfully.', result)
        }
        return sendError(res, 'Update a blog failed.')
    } catch (error) {
        console.log(error)
        return sendServerError(res)
    }
})

/**
 * @route DELETE api/admin/blog/:blogID
 * @description delete a blog by id
 * @access private
 */
blogAdminRoute.delete("/:blogID", async(req, res) => {
    try {
        const { blogID } = req.params
        if(!blogID.match(/^[0-9a-fA-F]{24}$/)){
            return sendError(res, 'Blog ID does not existed.')
        }
        const blog = await Blog.findById({ _id: blogID })
        if(!blog) return sendError(res, 'Blog ID does not existed.')
        if(blog){
            await Blog.findByIdAndDelete({ _id: blogID })
            return sendSuccess(res, 'Delete blog successfully.')
        }
        return sendError(res, 'Delete blog failed.')
    } catch (error) {
        console.log(error)
        return sendServerError(res)
    }
})

export default blogAdminRoute