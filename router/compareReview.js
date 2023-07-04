import express from "express"
import { sendError, sendServerError, sendSuccess } from "../helper/client.js"
import { verifyToken, verifyCustomer } from "../middleware/index.js"
import CompareReview from "../model/CompareReview.js"
import { getDateWhenEditSchedule } from "../service/compareReview.js"
import { COMPARE_REVIEW_TYPE } from "../constant.js"

const compareRepairRoute = express.Router()

/**
 * @route PATCH /api/compare-review
 * @description customer update comparereview schedule type
 * @access public
 */
compareRepairRoute.patch('/', verifyToken, verifyCustomer, async (req, res) => {
    try {
      const customer_id = req.user.role._id;
      const {schedule_type} = req.body;

      var _date = await getDateWhenEditSchedule(schedule_type);

      await CompareReview.updateMany({
        customer : customer_id,
        isSent : false,
      },{$set:{
        schedule_type :  schedule_type,
        selected_date :  _date,
      }})

      return sendSuccess(res,"Customer update update comparereview schedule type success");
    } catch (error) {
      console.error(error);
      return sendServerError(res);
    }
});


/**
 * @route GET /api/compare-review/schedule_type
 * @description customer get comparereview schedule type
 * @access public
 */
compareRepairRoute.get('/schedule_type', verifyToken, verifyCustomer, async (req, res) => {
    try {

      const customer_id = req.user.role._id;

      var compareReview = await CompareReview.findOne({
          customer : customer_id,
          isSent : false,
      });

      var result_schedule_type = COMPARE_REVIEW_TYPE.DEFAULT;

      if (compareReview != null) {
        result_schedule_type = compareReview.schedule_type;
      }

      return sendSuccess(res,"Customer get comparereview success", 
          {schedule_type : result_schedule_type });

    } catch (error) {
      console.error(error);
      return sendServerError(res);
    }
});

export default compareRepairRoute