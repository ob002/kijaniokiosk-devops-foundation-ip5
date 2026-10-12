// KijaniKiosk Payments Module
function processPayment(amount) {
    if (amount <= 0) {
        throw new Error("Invalid payment amount");
    }
    return { status: "success", amount: amount };
}

module.exports = { processPayment };
