import mongoose from "mongoose"
import { ORDER_STATUS, PICK_UP_AT, CASH_PAYMENT, ISSUES_TYPE, COD_STATUS, PRODUCT_TYPE, SCAN_TYPE, TRANSPORTATION_TYPE, PAYMENT_METHOD } from "../constant.js"
const { Schema } = mongoose;

const OrderSchema = new Schema(
    {
        orderId: {
            type: String,
            unique: true,
            required: true
        },
        customer: {
            type: Schema.Types.ObjectId,
            ref: "customers",
            required: true
        },
        sender: {
            type: {
                name: {
                    type: String,
                    required: true
                },
                phone: {
                    type: String,
                    required: true
                },
                address: {
                    type: String,
                    required: true
                }
            },
            required: true
        },
        receiver: {
            type: {
                name: {
                    type: String,
                    required: true
                },
                phone: {
                    type: String,
                    required: true
                },
                address: {
                    type: String,
                    required: true
                }
            },
            required: true
        },
        origin: {
            type: Schema.Types.ObjectId,
            ref: "post_office",
            default: null

        },
        destination: {
            type: Schema.Types.ObjectId,
            ref: "post_office",
            default: null
        },
        status: {
            type: String,
            enum: Object.values(ORDER_STATUS),
            default: ORDER_STATUS.waiting_for_pickup,
            required: true
        },
        route: [
            {
                type: Schema.Types.ObjectId,
                ref: "warehouses"
            },
        ],
        tracking: [{
            type: {
                scan_type: {
                    type: String,
                    enum: Object.values(SCAN_TYPE),
                    required: true,
                },
                confirm_staff: {
                    type: Schema.Types.ObjectId,
                    ref: "staffs",
                },
                driver: {
                    type: Schema.Types.ObjectId,
                    ref: "staffs",
                },
                shipper: {
                    type: Schema.Types.ObjectId,
                    ref: "staffs",
                },
                scan_code_time: {
                    type: String,
                    required: true,
                },
                transportation: {
                    type: String,
                    enum: Object.values(TRANSPORTATION_TYPE),
                },
                warehouse: {
                    type: Schema.Types.ObjectId,
                    ref: "warehouses"
                },
            },
        }],
        feedback: [
            {
                user: {
                    type: String,
                    required: true
                },
                content: {
                    type: String,
                    required: true
                }
            },
            { timestamps: true }
        ],
        cod: {
            type: {
                timeline: [{
                    status: {
                        type: String,
                        enum: Object.values(COD_STATUS),
                        default: COD_STATUS.waiting,
                        required: true
                    },
                    time: {
                        type: Date,
                        default: Date.now()
                    }
                }],
                cod: {
                    type: String,
                    default: 0
                },
                fee: {
                    type: String,
                    default: 0,
                },
                control_money: {
                    type: String,
                    default: 0
                }
            }
        },
        shipping: {
            type: {
                id: {
                    type: String
                },
                insurance_fees: {
                    type: String
                },
                fuel_surcharge: {
                    type: String
                },
                remote_areas_surcharge: {
                    type: String
                },
                other: {
                    type: String
                },
                VAT: {
                    type: Schema.Types.ObjectId,
                    ref: "tax"
                },
                discount: {
                    type: Schema.Types.ObjectId,
                    ref: "discounts"
                },
                note: {
                    type: String
                },
                copyright_fee: {
                    type: String
                },
                amount_payable: {
                    type: String
                },
                standard_fee: {
                    type: String
                },
                total_amount_before_discount: {
                    type: String
                },
                total_amount_after_discount: {
                    type: String
                },
                total_amount_after_tax_and_discount: {
                    type: String
                },
                pick_up_time: {
                    type: String
                }
            }
        },
        product: {
            type: {
                name: {
                    type: String,
                },
                quantity: {
                    type: String,
                },
                types: {
                    type: String,
                    enum: Object.values(PRODUCT_TYPE),
                },
                goods_value: {
                    type: String,
                },
                unit: {
                    type: String,
                },
                weight: {
                    type: String,
                },
                other: {
                    type: String,
                },
                note: {
                    type: String,
                },
                service: {
                    type: String
                },
                payment_person: {
                    type: String
                },
                payment_methods: {
                    type: String,
                    enum: Object.values(PAYMENT_METHOD),
                }
            }
        },
        cash_payment: {
            type: String,
            enum: Object.values(CASH_PAYMENT),
            default: CASH_PAYMENT.PP_CASH,
            required: true
        },
        timeline: {
            type: [{
                status: {
                    type: String,
                    enum: Object.values(ORDER_STATUS),
                    default: ORDER_STATUS.waiting_for_pickup,
                    required: true
                },
                time: {
                    type: Date,
                    default: Date.now()
                }
            }],
            default: function () {
                return [{
                    status: ORDER_STATUS.waiting_for_pickup,
                    time: Date.now()
                }];
            }
        },
        company: {
            type: {
                name: {
                    type: String
                },
                address: {
                    type: String
                },
                note: {
                    type: String
                }
            },
            default: null
        }
    },
    { timestamps: true }
)

export default mongoose.model('orders', OrderSchema)
