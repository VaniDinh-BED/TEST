import Error from "../helper/error.js"
import {
    TypeOfProblem,
  } from "../constant.js";

export const createAllProblemOrder = data => {
    const error = new Error()
    error.isRequired(data.orderId, 'orderId')
    .isRequired(data.issueType, 'issueType')
    .isInRange(data.issueType, TypeOfProblem)

    
    return error.get()
}