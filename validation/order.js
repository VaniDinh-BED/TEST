import { ORDER_STATUS, PICK_UP_AT, PRODUCT_UNIT, SCAN_TYPE, TRANSPORTATION_TYPE } from "../constant.js"
import Error from "../helper/error.js"

export const updateOrderValidate = (data) => {
  const error = new Error()

  error
    .isRequiredObject(data.sender, "sender", ["name", "phone"])
    .isRequiredObject(data.receiver, "receiver", ["name", "phone"])
    .isRequiredObject(data.origin, "origin", ["loading", "address"])
    .isRequiredObject(data.destination, "destination", ["unloading", "address"])
    .isRequiredObjectArray(data.products, "products", 1, ["name", "quantity", "unit"])

  if (!error.get()) {
    error.isInRange(data.origin.loading, PICK_UP_AT)
      .isInRange(data.destination.unloading, PICK_UP_AT)
    if (data.origin.loading === PICK_UP_AT.SHIP)
      error.isRequiredObject(data.origin.address, "origin's address", ["street", "ward", "district", "province"])
    else if (data.origin.loading === PICK_UP_AT.ON_SITE)
      error.isValidLength(data.origin.address, "origin's address", 24, 24)
    if (data.destination.unloading === PICK_UP_AT.SHIP)
      error.isRequiredObject(
        data.destination.address, "destination's address", ["street", "ward", "district", "province"])
    else if (data.destination.unloading === PICK_UP_AT.ON_SITE)
      error.isValidLength(data.destination.address, "destination's address", 24, 24)
  }

  if (!error.get())
    data.products.forEach((product) => {
      error.isInRange(product.unit, PRODUCT_UNIT);
      error.isRequiredAndInRangeOfNumber(product.quantity, "quantity of a product", { min: 1 })
    })
  return error.get()
}

export const updateOrderStatusValidate = (data) => {
  const error = new Error()

  error.isRequired(data.status, "status").isInRange(data.status, ORDER_STATUS)

  return error.get()
};

export const updateOrderTrackingValidate = (data) => {
  const error = new Error()
  error
  .isRequired(data.scan_type, "scan_type")
  .isInRangeName(data.scan_type, SCAN_TYPE, "scan_type")
  
  error
  .isRequired(data.scan_code_time, "scan_code_time")

  switch(data.scan_type) {
    case  SCAN_TYPE.RECIVED_ORDER:
        error
          .isRequired(data.post_office  , "post_office");         
        break;
    
    case SCAN_TYPE.SENDING_POSTOFFICE:
        error
          .isRequired(data.driver  , "driver")
          .isRequired(data.transportation, "transportation")
          .isInRangeName(data.transportation, TRANSPORTATION_TYPE, "transportation")
          .isRequired(data.post_office  , "post_office");              
        break;
    case  SCAN_TYPE.INCOMING_POSTOFFICE:
        error
          .isRequired(data.driver  , "driver")    
          .isRequired(data.transportation, "transportation")
          .isInRangeName(data.transportation, TRANSPORTATION_TYPE, "transportation")
          .isRequired(data.post_office  , "post_office");    
        break;
    case  SCAN_TYPE.SENDING_WAREHOUSE:
        error
          .isRequired(data.warehouse, "warehouse")
          .isRequired(data.driver  , "driver")  
          .isRequired(data.transportation, "transportation")
          .isInRangeName(data.transportation, TRANSPORTATION_TYPE, "transportation")
        break;
    case  SCAN_TYPE.INCOMING_WAREHOUSE:
        error
          .isRequired(data.warehouse, "warehouse")
          .isRequired(data.driver  , "driver")  
          .isRequired(data.transportation, "transportation")
          .isInRangeName(data.transportation, TRANSPORTATION_TYPE, "transportation")
        break;
    case  SCAN_TYPE.SHIPPING:
        error
          .isRequired(data.shipper, "shipper")
          .isRequired(data.transportation, "transportation")
          .isInRangeName(data.transportation, TRANSPORTATION_TYPE, "transportation")
          .isRequired(data.post_office  , "post_office");  
        break;
    default:
      // code block
  }

  return error.get()
}
