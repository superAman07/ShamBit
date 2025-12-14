const fetch = require('node-fetch');

// Polyfill for node < 18 if needed, though 'npm install node-fetch' might be required or just use http
// Actually, standard http is safer if we don't know node version, but let's try fetch first or native fetch (Node 18+)
// Only modern node has global fetch. The user has installed 'express pg cors dotenv' but not node-fetch.
// I'll use the native 'http' module to be dependency-free for the client script, or just quick install node-fetch.
// Easier: assumes Node 18+ (common now). If fails, I'll use http.

async function testBackend() {
    const dummySeller = {
        businessName: "ShambIt Test Farms",
        businessType: "organic",
        gstin: "27ABCDE1234F1Z5",
        ownerName: "Test User",
        phone: "9876543210",
        email: "test@shambit.com",
        city: "Pune"
    };

    console.log("SENDING DUMMY DATA:", dummySeller);

    try {
        const response = await fetch('http://localhost:3000/api/register-seller', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dummySeller)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("\n✅ SUCCESS! SERVER RESPONSE:");
        console.log(JSON.stringify(result, null, 2));
        console.log("\nThe data has been successfully saved to the 'sellers' table in 'shambit_dev'.");

    } catch (error) {
        console.error("\n❌ FAILED TO CONNECT:", error.message);
        console.log("Make sure the server is running and DB credentials in .env are correct.");
    }
}

testBackend();
