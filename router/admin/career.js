import express from "express";
import {
  sendError,
  sendServerError,
  sendSuccess,
} from "../../helper/client.js";
import Career from "../../model/Career.js";
import { careerValidate } from "../../validation/career.js";
import Department from "../../model/Department.js";

const careerAdminRoute = express.Router();

/**
 * @route POST /api/admin/career/create
 * @description create new career and add career to department
 * @access private
 */
careerAdminRoute.post("/create", async (req, res) => {
  try {
    const errors = careerValidate(req.body)
    if (errors) return sendError(res, errors)

    let { departmentId, name, type, description, location, state, bonus, deadline } = req.body

    if(!departmentId.match(/^[0-9a-fA-F]{24}$/) && departmentId != null){
      return sendError(res, "Department does not exist.")
    }

    const departments = await Department.find()
    if (!departments) return sendError(res, 'Department does not exist.')

    const career = await Career.create({name, type, description, location, state, bonus, deadline})

    const updateCareer = await Department.findOneAndUpdate(
      { _id: departmentId },
      { $push: { careers: career } }
    )
    if(!updateCareer) return sendError(res, "Update career fail.")
    return sendSuccess(res, "Create new career successfully.", career)
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
});

/**
 * @route PUT /api/admin/career/:id
 * @description update details of an existing career
 * @access private
 */
careerAdminRoute.put("/:id", async (req, res) => {
  const { id } = req.params;
  const errors = careerValidate(req.body);
  if (errors) return sendError(res, errors);
  let { name, type, description, location, state, bonus, deadline, applicants } = req.body;
  if (!id.match(/^[0-9a-fA-F]{24}$/))
    return sendError(res, "Distance information is not found.")
  try {
    let career = null;
    const careers = await Career.find();
    if (careers.length > 0) {
      careers.find((item) => {
        if (item._id === id) {
          career = item
        } else {
          return sendError(res, "Career does not exist.");
        }

      })
    } else { return sendError(res, "Career does not exist."); }

    if (career !== null) {
      await Career.findByIdAndUpdate(id, {
        name: name,
        type: type,
        description: description,
        location: location,
        state: state,
        bonus: bonus,
        deadline: deadline,
        applicants: applicants
      });
      return sendSuccess(res, "Update career successfully.", {
        name: name,
        type: type,
        description: description,
        location: location,
        state: state,
        bonus: bonus,
        deadline: deadline,
        applicants: applicants
      });
    }
    return sendError(res, "Career does not exist.");
  } catch (error) {
    return sendServerError(res);
  }
});

/**
 * @route DELETE /api/admin/career/:id
 * @description delete an existing career
 * @access private
 */
careerAdminRoute.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id.match(/^[0-9a-fA-F]{24}$/))
    return sendError(res, "Distance information is not found.")
  try {
    let career = null
    const careers = await Career.find();
    if (careers.length > 0) {
      careers.find((item) => {
        if (item._id === id) {
          career = item
        } else {
          return sendError(res, "Career does not exits.")
        }
      })
    } else { return sendError(res, "Career does not exits.") }

    if (career !== null) return sendError(res, "Career does not exist.");
    career = await Career.findByIdAndRemove(id)
    return sendSuccess(res, "Delete career successfully.", career);
  } catch (error) {
    console.log(error);
    return sendServerError(res);
  }
});

export default careerAdminRoute;
