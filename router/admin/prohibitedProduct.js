import express from "express"
import { sendError, sendServerError, sendSuccess } from "../../helper/client.js"
import ProhibitedProduct from "../../model/ProhibitedProduct.js"
import { handleFilePath, uploadResources } from '../../constant.js'
import { createImageDir, createLogoDir, createUploadDir } from "../../middleware/index.js"
import {addProhibitedProductValidate} from "../../validation/prohibitedProduct.js"

const prohibitedProductAdminRoute = express.Router()

/**
 * @route GET /api/admin/prohibited-product
 * @description get all prohibited product 
 * @access private
 */
prohibitedProductAdminRoute.get('/',
async (req,res)=>{
    try {
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const {sortBy, keyword } = req.query;
    var listKeyword = keyword
      ? {
          $or: [{ name: { $regex: keyword, $options: "i" } }],
        }
      : {};
    const list = await ProhibitedProduct.find(listKeyword)
      .limit(pageSize)
      .skip(pageSize * page)
      .sort(`${sortBy}`);
    if (list)
    {
      return sendSuccess(res, "Get prohobited product successfully.", {
        list,
      });}else
     
   { return sendError(res, "Information not found.");}
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
}
)

/**
 * @route GET /api/admin/prohibited-product/:name
 * @description get prohibited product by name
 * @access private
 */
prohibitedProductAdminRoute.get('/:name',
async (req,res)=>{
    try {
        const { name } = req.params;
        const prohibitedProduct = await ProhibitedProduct.find({ name: name });
        if (prohibitedProduct)
          return sendSuccess(
            res,
            "Get information of prohibited product successfully.",
            prohibitedProduct
          );
        return sendError(res, "Information of prohibited product is not found.");
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
}
)

/**
 * @route POST /api/admin/prohibited-product/create
 * @description create new prohibited product
 * @access private
 */
 prohibitedProductAdminRoute.post('/create', createImageDir,
    uploadResources.single('image'),   
    async (req, res) => {    

        try {      
            const error = addProhibitedProductValidate(req.body)
            if (error) return sendError(res, error)      
            const images = handleFilePath(req.file) 
            const {name, detail} = req.body;
            const isExist = await ProhibitedProduct.exists({name})
            if (isExist) {
                return sendError(res, "Name is already existed.")
            }              
            await ProhibitedProduct.create({name: name, images: images, detail: detail})
            return sendSuccess(res, 'Create prohibied product successfully.', {name, images, detail})
            
        } catch (error) {
            console.log(error)
            if (req.image) unlinkSync(req.image.path)
            return sendServerError(res)
        }
 })

/**
 * @route PUT /api/admin/prohibited-product/:id
 * @description update infomation of a existing prohibited product
 * @access private
 */
 prohibitedProductAdminRoute.put('/:id',createImageDir,
    uploadResources.single('image'),
    async (req, res) => {
        const {id} = req.params;
        const image = handleFilePath(req.file) 
        const {name, detail} = req.body;
        try {
            const isExist = await ProhibitedProduct.findById(id);
            if (isExist)
            {
                const isExistName = await ProhibitedProduct.exists({name})
                if (isExistName) 
                    return sendError(res, "Name is existed.")
                
                await ProhibitedProduct.findByIdAndUpdate(id, {name: name, images:image, detail: detail})
                return sendSuccess(res, "Update prohibited product successfully.", {name: name, image:image, detail: detail})
            }        
            return sendError(res, "Prohibited product not exists.")

        } catch (error) {
            console.log(error)
            if (req.image) unlinkSync(req.image.path)
            return sendServerError(res, error)
        }
    }
)

/**
 * @route DELETE /api/admin/prohibited-product/:id
 * @description delete a existing prohibited product
 * @access private
 */
 prohibitedProductAdminRoute.delete('/:id',
    async (req, res) => {
        const {id} = req.params;    
        try {
            const isExist = await ProhibitedProduct.exists({_id: id})
            if (!isExist) 
                return sendError(res, "Prohibited product not exists.")
            
            const data = await ProhibitedProduct.findByIdAndRemove(id)
            return sendSuccess(res, "Delete prohibited product successfully.", data)
        } catch (error) {
            console.log(error)
            return sendServerError(res)
        }
    })

export default prohibitedProductAdminRoute