import express from "express"
import { sendError, sendServerError, sendSuccess } from "../../helper/client.js"
import ProductShipment from "../../model/ProductShipment.js"
import Product from "../../model/Product.js"
import { createProductShipmentValidate } from "../../validation/productShipment.js"
import Order from "../../model/Order.js"
import { calculateShipmentFee, handleOrderInfo } from "../../service/order.js"
import { canCreateProductShipment, handleShipmentInfo } from "../../service/shipment.js"
import { ORDER_STATUS, PRODUCT_STATUS, PRODUCT_UNIT, RETURN_ZONE } from "../../constant.js"
import mongoose from "mongoose"
import Distance from "../../model/Distance.js"
import Price from "../../model/Price.js"
import Discount from "../../model/Discount.js"

const productShipmentAdminRoute = express.Router()

/**
 * @route GET /api/admin/product-shipment
 * @description get information of product shipments
 * @access private
 */
productShipmentAdminRoute.get("/", async (req, res) => {
  try {
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 0
    const page = req.query.page ? parseInt(req.query.page) : 0
    const { sortBy, product_id } = req.query

    let length = 0
    let resShipments = []
    if (product_id) {
      if (!product_id.match(/^[0-9a-fA-F]{24}$/))
        return sendError(res, "ProductId is not compatible")
      const product = await Product.findById(product_id).populate('product_shipments')
      if (!product) return sendError(res, "Product ID does not exist.")
      resShipments = product.product_shipments.map((shipment) => {
        return { ...shipment._doc, product_name: product.name }
      })
      length = product.product_shipments.length
    } else {
      length = await ProductShipment.count();
      const listProductShipment = await ProductShipment.find()
        .limit(pageSize)
        .skip(pageSize * page)
        .sort(`${sortBy}`)
      resShipments = await Promise.all(
        listProductShipment.map(async (shipment) => {
          return await handleShipmentInfo(shipment)
        })
      )
    }
    return sendSuccess(res, "Get product shipment information successfully", {
      length,
      shipments: resShipments
    });
  } catch (error) {
    console.log(error)
    return sendServerError(res)
  }
});

/**
 * @route GET /api/admin/product-shipment/:id
 * @description get information of product shipment by id
 * @access private
 */
productShipmentAdminRoute.get("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const productShipments = await ProductShipment.findById(id)
    if (productShipments)
      return sendSuccess(res, "Get product shipment successfully.", await handleShipmentInfo(productShipments))
    return sendError(res, "No information found.")
  } catch (error) {
    console.log(error)
    return sendServerError(res)
  }
})

/**
 * @route POST /api/admin/product-shipment/product/:product_id
 * @description create information of product shipment
 * @access private
 */
productShipmentAdminRoute.post("/product/:product_id", async (req, res) => {
  const errors = createProductShipmentValidate(req.body)
  if (errors) return sendError(res, errors)
  const { quantity, packing_cost, discountId } = req.body
  const { product_id } = req.params
  try {
    if (!product_id.match(/^[0-9a-fA-F]{24}$/))
      return sendError(res, "ProductId does not exist")
    const product = await Product.findById(product_id)
      .populate({
        path: "order",
        select: "service status",
        populate: {
          path: "service",
          select: "price distances"
        }
      })
      .exec()
    if (!product) return sendError(res, "Product id is not existed.")
    if (product.order.timeline.slice(-1).status !== ORDER_STATUS.waiting_for_pickup) {
      return sendError(res, "Can not divide the quantity of a product when the order is not waiting status.")}
    const canCreate = canCreateProductShipment(quantity, product);

    if (canCreate) {
      if (product.status === PRODUCT_STATUS.already) {
        product.product_shipments.forEach(async (shipment) => {
          await ProductShipment.findByIdAndDelete(shipment)
        })
        await Product.findByIdAndUpdate(product._id, {
          status: PRODUCT_STATUS.pending,
          product_shipments: []
        })
      }
      const order = await handleOrderInfo(await Order.findById(product.order))
      const [origin, destination] = [order.origin.address.province, order.destination.address.province]
      let distance
      for (const ele of product.order.service.distances) {
        const space = await Distance.findById(ele);
        if (
          (space.fromProvince === origin && space.toProvince === destination) ||
          (space.toProvince === origin && space.fromProvince === destination)
        ) {
          distance = ele;
        } else {
          return sendError(res, "No distances")
        }
      }
      const prices = await Price.findById(product.order.service.price);
      const distant = await Distance.findById(distance);
      
      let discount = 0
      const discountInfo = await Discount.findOne({_id: discountId})
      if (discountInfo) {
        discount = discountInfo.discount
        await Discount.findByIdAndDelete(discountId)
      }
      const totalQuantity = quantity.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
      const fee = await calculateShipmentFee(distant,totalQuantity,prices,product.unit, discount)
      const shipments = await ProductShipment.create({quantity: totalQuantity,value: fee + +packing_cost})
      await Product.findByIdAndUpdate({ _id: product_id },{$push: { product_shipments: shipments }})
      return sendSuccess(res, "Create shipment successfully", shipments)
    }
    return sendError(res, "Creating shipments is failed.")
  } catch (error) {
    console.log(error)
    return sendServerError(res)
  }
});

export default productShipmentAdminRoute
