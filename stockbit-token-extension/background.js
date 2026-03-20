console.log("Stockbit Token Syncer: Background script starting...");

// Configuration - Ganti domain ini dengan domain aplikasi Anda
// const APP_API_URL = "http://localhost:3000/api/update-token"; // Dev
const APP_API_URL = "http://billionman.netlify.app/api/eyJhbGciOiJSUzI1NiIsImtpZCI6ImExNWQ5OGE2LTdkYzgtNDM3NS05NDk0LTEyOWJlM2RlODVkNCIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InVzZSI6InZpbnNrYXRhc3lhIiwiZW1hIjoidGFzeWF2aW5za2FAZ21haWwuY29tIiwiZnVsIjoiVmluc2thIFRhc3lhIiwic2VzIjoiWGNla3JDeGFoR09pVmgwcCIsImR2YyI6IjI5YTMxNGY4ZTRjNzBhNWY3NzcyNTNkYzI1MmIxNDI4IiwidWlkIjo1MzMxNDU1LCJjb3UiOiJJRCJ9LCJleHAiOjE3NzQwNjk2ODYsImlhdCI6MTc3Mzk4MzI4NiwiaXNzIjoiU1RPQ0tCSVQiLCJqdGkiOiI2ODM3NDgzNC1lNWU4LTQ5YWUtYjExMS00OWNkNDliYzgwZDYiLCJuYmYiOjE3NzM5ODMyODYsInZlciI6InYxIn0.PRoxWfCSvoE6ezYb8VeS_j6GwMiqIaZrc1pisCjkpldau64Li2l_PfA-5d0M26tu4MRYQsG_WEOllDN_4z6MJVdz_7N1Oy1nOrcyrS-J7L6pow-F6bYK49A9LB5I9hnRY6lyM0yE-qMEKeIgJM8CClUqAMRzB4MZlbXibY3N2ocoy36XOy8jYc4BD9ZuvyZeTPQvd-OYTI39BIAYHwa55j0i-4IoJa4WrLlozVSn1QX1ErqIEUZL3YgsG0UJPalKbBp_-Eyy6rM2K0Nt609uZUl4tD37Vc9kPrTUhL95tZNRYq4m7WbySPXjHTH5GIohpkESpPPKCTVxqL5_jdNtWA"; // Prod

console.log("Target API URL:", APP_API_URL);

let lastSyncedToken = null;

console.log("Registering webRequest listener...");


// Helper to decode JWT payload
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    console.log("Checking request:", details.url);
    
    // Look for the Authorization header
    const authHeader = details.requestHeaders.find(
      (header) => header.name.toLowerCase() === "authorization"
    );

    if (authHeader && authHeader.value) {
      // Check if it is a Bearer token
      if (authHeader.value.startsWith("Bearer ")) {
        const token = authHeader.value.substring(7); // Remove "Bearer " prefix

        // Only sync if the token has changed to avoid spamming the API
        if (token !== lastSyncedToken) {
          console.log("New token candidate detected...");
          
          const decoded = parseJwt(token);
          
          // Only sync if it's a valid JWT (must have a payload with an expiry)
          if (!decoded || !decoded.exp) {
            console.log("Skipping non-JWT or invalid token.");
            return;
          }

          console.log("Valid JWT detected from:", details.url);
          const expiresAt = decoded.exp;
          
          // Debugging
          console.log("Token Expiry:", new Date(expiresAt * 1000));
          
          syncToken(token, expiresAt);
        }
      }
    }
  },
  { urls: ["https://*.stockbit.com/*"] },
  ["requestHeaders", "extraHeaders"]
);

function syncToken(token, expiresAt) {
  const payload = {
    token: token,
    expires_at: expiresAt
  };

  fetch(APP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
    .then((response) => {
      if (response.ok) {
        console.log("Token successfully synced to API.");
        lastSyncedToken = token; // Update cache on success
      } else {
        console.error("Failed to sync token. Status:", response.status);
      }
    })
    .catch((error) => {
      console.error("Error syncing token:", error);
    });
}
