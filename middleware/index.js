import jwt from "jsonwebtoken"
import { mkdir } from "fs"
import { sendError, sendServerError } from "../helper/client.js"
import { TOKEN_BLACKLIST, TOKEN_LIST } from "../index.js"
import individualContract from "../model/IndividualContract.js"
import businessContract from "../model/BusinessContract.js"
import Customer from "../model/Customer.js"
import fs from 'fs'
import multer from 'multer';
import path from 'path';
/**
 * 
 */
export const createUploadDir = (req, res, next) => {
    const d = new Date()
    const dirName = d.toISOString().slice(0, 7)
    mkdir(`public/uploads/${dirName}`, { recursive: true }, (err) => {
        if (err) return sendError(res, 'Cannot upload file.')
    })
    req.dirName = dirName
    next()
}

export const createAssetsDir = (req, res, next) => {
    mkdir(`public/assets`, { recursive: true }, (err) => {
        if (err) return sendError(res, 'Cannot upload file.')
    })
    req.dirName = 'assets'
    next()
}
export const createBankAccountsDir = (req, res, next) => {
    mkdir(`public/bankaccount`, { recursive: true }, (err) => {
        if (err) {
            console.error(err);
            return sendError(res, 'Cannot upload file.');
        }
        console.log('Folder created successfully.');
    })
    req.dirName = 'bankaccount'
    next()
}
export const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'public/bankaccount/');
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb("Only image files are allowed!");
    }
});
export const createPrivateDir = async (req, res, next) => {
    let { id } = await req.params
    if (id) {
        const isExist = await individualContract.findOne({ customer: id })
        if (isExist) {
            fs.unlink(isExist.ID_front_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            fs.unlink(isExist.ID_back_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            fs.unlink(isExist.portrait_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
        }
    } else {
        const isExist = await individualContract.findOne({ customer: req.user.role._id })
        if (isExist) {
            fs.unlink(isExist.ID_front_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            fs.unlink(isExist.ID_back_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            fs.unlink(isExist.portrait_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
        }
    }

    await mkdir(`public/private`, { recursive: true }, (err) => {
        if (err) return sendError(res, 'Cannot upload file.')
    })
    req.dirName = await 'private'
    await next()
}

export const createBusinessDir = async (req, res, next) => {
    let { id } = await req.params
    if (id) {
        const isExist = await businessContract.findOne({ customer: id })
        if (isExist) {
            fs.unlink(isExist.ID_front_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            fs.unlink(isExist.ID_back_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            fs.unlink(isExist.portrait_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
        }
    } else {
        const isExist = await businessContract.findOne({ customer: req.user.role._id })
        if (isExist) {
            fs.unlink(isExist.ID_front_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            fs.unlink(isExist.ID_back_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            fs.unlink(isExist.portrait_photo, (err) => {
                if (err) {
                    console.error(err)
                }
            })
        }
    }

    await mkdir(`public/business`, { recursive: true }, (err) => {
        if (err) return sendError(res, 'Cannot upload file.')
    })
    req.dirName = await 'business'
    await next()
}
export const createLogoDir = (req, res, next) => {
    mkdir(`public/logo`, { recursive: true }, (err) => {
        if (err) return sendError(res, 'Cannot upload file.')
    })
    req.dirName = 'logo'
    next()
}

export const createImageDir = (req, res, next) => {
    mkdir(`public/images`, { recursive: true }, (err) => {
        if (err) return sendError(res, 'Cannot upload file.')
    })
    req.dirName = 'images'
    next()
}

/**
 * header contain
 * Authorised : Bearer token
 */
export const verifyToken = async (req, res, next) => {
    try {
        const data = req.headers['authorization']
        const token = data?.split(" ")[1];
        if (!token) return sendError(res, 'jwt must be provided.', 401)

        if (token in TOKEN_LIST || token in TOKEN_BLACKLIST)
            return sendError(res, "Unauthorized.", 401)

        const { payload } = jwt.verify(token, process.env.JWT_SECRET_KEY, {
            complete: true
        })

        if (!payload.user) return sendError(res, "Unauthorized.", 401)

        req.verifyToken = token
        req.user = payload.user
        next()

    } catch (error) {
        return sendError(res, 'jwt expired.', 401)
    }
}

export const verifyAdmin = async (req, res, next) => {
    if (req.user.role.staff_type !== 'admin')
        return sendError(res, 'Forbidden.', 403)
    next()
}

export const verifyStaff = async (req, res, next) => {
    if (!req.user.role.hasOwnProperty('staff_type'))
        return sendError(res, 'Forbidden.', 403)
    next()
}

export const verifyCustomer = async (req, res, next) => {
    if (req.params.customerId) {
        const { customerId } = await req.params
        if (customerId.length !== 24) {
            return sendError(res, 'Wrong ID of Customer')
        }
        const isExistCustomer = await Customer.exists({ _id: customerId, })
        if (isExistCustomer == null && !req.user.role.hasOwnProperty('customer_type'))
            return sendError(res, 'Forbidden.', 403)
    } else if (!req.user.role.hasOwnProperty('customer_type'))
        return sendError(res, 'Forbidden.', 403)
    next()
}
export const verifyStorekeeper = async (req, res, next) => {
    if (req.user.role.staff_type !== 'storekeeper')
        return sendError(res, 'Forbidden.', 403)
    next()
}
export const verifyCustomerOrAdmin = async (req, res, next) => {
    if (req.user.role.staff_type !== 'admin' && (!req.user.role.hasOwnProperty('customer_type')))
        return sendError(res, 'Forbidden.', 403)
    next()
}
export const verifyDriver = async (req, res, next) => {
    if (req.user.role.staff_type !== 'driver')
        return sendError(res, 'Forbidden.', 403)
    next()
}
export const verifyShipper = async (req, res, next) => {
    if (req.user.role.staff_type !== 'shipper')
        return sendError(res, 'Forbidden.', 403)
    next()
}
