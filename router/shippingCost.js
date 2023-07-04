import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bodyParser from "body-parser";
import { calculateShippingExpressCost } from "../helper/caculatorCost.js"
import { autocompeleteAddress } from "../helper/autocompleteAddress.js"
import { FUEL_FEE } from "../constant.js";
import { sendError, sendServerError, sendSuccess } from "../helper/client.js"
const app = express();
app.use(bodyParser.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const filePath = path.join(__dirname, '..', 'data', 'dvhcvn.json');
const filePath_Express_Standard = path.join(__dirname, '..', 'data', 'express', 'standard_fee.json');
const filePath_Express_Fast = path.join(__dirname, '..', 'data', 'express', 'fast_fee.json');
const filePath_Express_Super = path.join(__dirname, '..', 'data', 'express', 'super_fee.json');

router.post('/suggest/start-point', (req, res) => {
    const { keyword } = req.body;
    autocompeleteAddress(keyword, res);
});
router.post('/suggest/end-point', (req, res) => {
    const { keyword } = req.body;
    autocompeleteAddress(keyword, res);
});

router.post('/shipping-cost', (req, res) => {
    try {
        let code_area1 = '';
        let code_area2 = '';
        let fromCity = '';
        let toCity = '';
        let key = '';
        let shipCost = [];
        let checkInOut = '';
        const weight = req.body.weight;
        const shippingtype = req.body.shippingtype;
        const locationString1 = req.body.name1;
        const locationString2 = req.body.name2;

        const cityName1 = locationString1.slice(locationString1.lastIndexOf(",") + 1);
        const cityName2 = locationString2.slice(locationString2.lastIndexOf(",") + 1);

        if (locationString1 == '' || locationString2 == '' || weight == 0 || shippingtype == '') {
            return sendError(res, "Please enter full information.");
        }

        const data = JSON.parse(fs.readFileSync(filePath));
        data.forEach((level1) => {
            const level1Name = level1.name.toLowerCase();
            if (level1Name.includes(cityName1.toLowerCase())) {
                fromCity = level1.code_name;
            }
        });
        data.forEach((level1) => {
            const level1Name2 = level1.name.toLowerCase();
            if (level1Name2.includes(cityName2.toLowerCase())) {
                toCity = level1.code_name;
            }
        });

        if (shippingtype == 'standard'){
            const data_express_standard = JSON.parse(fs.readFileSync(filePath_Express_Standard));
            data_express_standard[fromCity].cities.forEach((city) => {
                if (city.code_name.includes(toCity)) {
                    code_area2 = city.code_area;
                }
            });
            code_area1 = data_express_standard[fromCity].code_area;
            key = `${code_area1}-${code_area2}`;
            data_express_standard[fromCity].level2s.forEach((level2) => {
                if (level2.level2_id.includes(key)) {
                    shipCost = level2.cost;
                }
            });
        }else if (shippingtype == 'fast'){
            const data_express_fast = JSON.parse(fs.readFileSync(filePath_Express_Fast));
            data_express_fast[fromCity].cities.forEach((city) => {
                if (city.code_name.includes(toCity)) {
                    code_area2 = city.code_area;
                }
            });
            code_area1 = data_express_fast[fromCity].code_area;
            key = `${code_area1}-${code_area2}`;
            data_express_fast[fromCity].level2s.forEach((level2) => {
                if (level2.level2_id.includes(key)) {
                    shipCost = level2.cost;
                }
            });
        }else if (shippingtype == 'super'){
            if (weight > 10){
                return sendError(res, "Weight is not allowed to be more than 10kg.");
            }
            const data_express_super = JSON.parse(fs.readFileSync(filePath_Express_Super));
            const district2 = locationString2.slice(locationString2.indexOf(",")+1,locationString2.lastIndexOf(","));
            data_express_super[fromCity].cities.forEach((city) => {
                if (city.code_name.includes(toCity)) {
                    code_area2 = city.code_area;
                    if (city.In.toLowerCase().includes(district2.toLowerCase())){
                        checkInOut = 'In';
                    }
                    else if (city.Out.toLowerCase().includes(district2.toLowerCase()))
                            checkInOut = 'Out';
                    return;
                }
            });
            code_area1 = data_express_super[fromCity].code_area;
            key = `${code_area1}-${code_area2}`;
            data_express_super[fromCity].level2s.forEach((level2) => {
                if (level2.level2_id.includes(key)) {
                    if (checkInOut == 'In')
                        shipCost = level2.costIn;
                    else
                        shipCost = level2.costOut;
                }
            });
        }

        const totalPrice = calculateShippingExpressCost(weight, shipCost, FUEL_FEE, shippingtype);

        return sendSuccess(res, "Successfully", {shippingcost: totalPrice} );

    } catch (error) {
        console.log(error);
        sendServerError(res, error);
    }

});
export default router;
