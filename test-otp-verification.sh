#!/bin/bash

# Test OTP verification with all required fields
curl -X POST http://localhost:3000/api/v1/seller-registration/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9044956870",
    "otp": "378472",
    "fullName": "Amit Kumar Upadhyay",
    "email": "amit794@jbnss.in",
    "password": "Abc@12345"
  }'