import express from "express";
import { verifyToken,verifyCustomer } from "../middleware/index.js"
import User from "../model/User.js"
import Customer from "../model/Customer.js"
import { validateBankAccountUpdate,bankVerifyOTP } from "../validation/bank.js"
import multer from 'multer';
import path from 'path';
import { genarateOTP } from '../service/otp.js'
import { sendError, sendServerError, sendSuccess, sendAutoSMS } from "../helper/client.js"
import fs from 'fs'
import {upload,createBankAccountsDir} from '../middleware/index.js'
const bankAccountRouter = express.Router();
let otpCheckValue = false;

bankAccountRouter.get('/', verifyToken,verifyCustomer, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return sendError(res, "User not found", 404);
        }

        const customer = await Customer.findById(user.role);
        if (!customer) {
            return sendError(res, "Customer not found", 404);
        }

        const bankAccountInfo = {
            bankName: customer.bank_name,
            accountNumber: customer.bank_account_number,
            branch: customer.branch,
            bank_account_number: customer.bank_account_number,
            bank_account_owner_name: customer.bank_account_owner_name,
            identity_card_number: customer.identity_card_number,
            identity_card_front_image: customer.identity_card_front_image,
            identity_card_back_image: customer.identity_card_back_image,
        };

        return sendSuccess(res, 'get about information successfully.', bankAccountInfo)
    } catch (error) {
        console.log(error);

        sendError(res, "Internal server error", 500);
    }
});



bankAccountRouter.post('/bank-update', verifyToken,verifyCustomer,createBankAccountsDir, upload.fields([
    { name: 'identity_card_front_image', maxCount: 1 },
    { name: 'identity_card_back_image', maxCount: 1 }
]), async (req, res) => {

    let { bankName, accountNumber, branch, bank_account_owner_name, identity_card_number } = req.body;
    const identityCardFrontImagePath = req.files && req.files.identity_card_front_image ? req.files.identity_card_front_image[0].path : null;
    const identityCardBackImagePath = req.files && req.files.identity_card_back_image ? req.files.identity_card_back_image[0].path : null;
    const errors = validateBankAccountUpdate(req.body);
    if (errors) {
        if (identityCardFrontImagePath) 
            fs.unlinkSync(identityCardFrontImagePath);
        if (identityCardBackImagePath) 
            fs.unlinkSync(identityCardBackImagePath);
        return sendError(res, errors);
    }
    try {
        const customer = await Customer.findById(req.user.role);
        if (!customer) {
            return sendError(res, "Customer not found", 404);
        }
        const user = await User.findById(req.user.id);
        const phone = `+84${user.phone.slice(1)}`;


        const otp = genarateOTP();
        console.log(otp)
        const options = {
            from: process.env.PHONE_NUMBER,
            to: phone,
            body: `Nhập mã OTP để hoàn tất cập nhật: ${otp.value}`
        }
        const sendSMSSuccess = await sendAutoSMS(options);
        if (!sendSMSSuccess) {
            if (identityCardFrontImagePath) {
                fs.unlinkSync(identityCardFrontImagePath);
            }
            if (identityCardBackImagePath) {
                fs.unlinkSync(identityCardBackImagePath);
            }
            return sendError(res, 'send OTP failed.');
        }
        
        req.session.updateBank = JSON.stringify({
            bankName,
            accountNumber,
            branch,
            bank_account_owner_name,
            identity_card_number,
            identity_card_front_image: identityCardFrontImagePath,
            identity_card_back_image: identityCardBackImagePath,
            otp
        });
        setTimeout(() => { 
            if(!otpCheckValue){
                fs.unlinkSync(identityCardFrontImagePath);
                fs.unlinkSync(identityCardBackImagePath);
                req.session.destroy();
            }else{
                req.session.destroy();
                otpCheckValue = false;
            } 
        }, 63000);
        return sendSuccess(res, 'send otp code successfully.');
    } catch (error) {
        console.log(error);
        if (identityCardFrontImagePath) {
            fs.unlinkSync(identityCardFrontImagePath);
        }
        if (identityCardBackImagePath) {
            fs.unlinkSync(identityCardBackImagePath);
        }
        sendError(res, "Internal server error", 500);
    }
});

bankAccountRouter.post('/verify-otp', verifyToken,verifyCustomer, async (req, res) => {
    const errors = bankVerifyOTP(req.body)
    if (errors) {
        return sendError(res, errors)
    }
    try {
        if (!req.session.updateBank) {
            return sendError(res, 'Session error.', 404);
        }
        const { bankName, accountNumber, branch, bank_account_owner_name, identity_card_number, identity_card_front_image, identity_card_back_image, otp } = JSON.parse(req.session.updateBank);
        const customer = await Customer.findById(req.user.role);
        if (!customer) {
            return sendError(res, "Customer not found", 404);
        }
        if (req.body.otp !== otp.value || otp.expired < Date.now()) {
            if (identity_card_front_image) {
                fs.unlinkSync(identity_card_front_image);
            }
            if (identity_card_back_image) {
                fs.unlinkSync(identity_card_back_image);
            }
            return sendError(res, 'validate failed.');
        }
        customer.bank_name = bankName;
        customer.bank_account_number = accountNumber;
        customer.branch = branch;
        customer.bank_account_owner_name = bank_account_owner_name;
        customer.identity_card_number = identity_card_number;

        if (identity_card_front_image) {
            const destinationPath = 'public/bankaccount/' + path.basename(identity_card_front_image);
            fs.renameSync(identity_card_front_image, destinationPath);
            customer.identity_card_front_image = destinationPath;
        }
        if (identity_card_back_image) {
            const destinationPath = 'public/bankaccount/' + path.basename(identity_card_back_image);
            fs.renameSync(identity_card_back_image, destinationPath);
            customer.identity_card_back_image = destinationPath;
        }
        await customer.save();
        otpCheckValue = true; 
        
        return sendSuccess(res, "Update bank account information successfully.");
    } catch (error) {
        console.log(error);
        sendError(res, "Internal server error", 500);
    }
});

bankAccountRouter.post('/update-otp', verifyToken,verifyCustomer, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return sendError(res, "User not found", 404);
        }
        const sessionStore = JSON.parse(req.session.updateBank)
        const otp = genarateOTP();
        const phone = `+84${user.phone.slice(1)}`;
        const options = {
            from: process.env.PHONE_NUMBER,
            to: phone,
            body: `Your new OTP is: ${otp.value}`
        }
        const sendSMSSuccess = await sendAutoSMS(options);
        if (!sendSMSSuccess) return sendError(res, 'send OTP failed.')

        sessionStore.otp = otp
        req.session.updateBank = JSON.stringify(sessionStore);

        return sendSuccess(res, 'New OTP sent successfully.');
    } catch (error) {
        console.log(error);
        sendError(res, "Internal server error", 500);
    }
});

export default bankAccountRouter;
