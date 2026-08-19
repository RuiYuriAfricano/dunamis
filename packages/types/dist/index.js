"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.Role = exports.Gender = void 0;
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
})(Gender || (exports.Gender = Gender = {}));
var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["OPERATOR"] = "OPERATOR";
})(Role || (exports.Role = Role = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["CONFIRMED"] = "CONFIRMED";
    PaymentStatus["REJECTED"] = "REJECTED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
