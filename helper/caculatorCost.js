export function calculateShippingExpressCost(weight, shipCost,FUEL_FEE, shippingtype) {
    try {
        let totalPrice = 0;
        if (weight <= 0.5) {
            totalPrice = Math.ceil(shipCost[0] + (FUEL_FEE * 0.15));
        } else if (weight <= 1) {
            totalPrice = Math.ceil(shipCost[1] + (FUEL_FEE * 0.15));
        } else if (weight <= 1.5) {
            totalPrice = Math.ceil(shipCost[2] + (FUEL_FEE * 0.15));
        } else if (weight <= 2) {
            totalPrice = Math.ceil(shipCost[3] + (FUEL_FEE * 0.15));
        } else {
            const baseWeight = 2;
            const numberOfIncreases = Math.ceil((weight - baseWeight) / 0.5);
            totalPrice = Math.ceil(shipCost[3] + (FUEL_FEE * 0.15) + (numberOfIncreases * shipCost[4]) );
            if(weight >=10 && shippingtype != 'super'){
                totalPrice = totalPrice + Math.ceil(totalPrice * 0.2);
            }
        }
        totalPrice = totalPrice + Math.ceil(totalPrice*0.1);
        return totalPrice;
    } catch (error) {
        console.log(error);
        sendServerError(res, error);
    }
}
