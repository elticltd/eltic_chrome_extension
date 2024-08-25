let token = null;

document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get(["token", "email", "limit"], function (result) {
    token = result.token;
    if (token) {
      document.getElementById("email").value = result.email || "";
      document.getElementById("limit").value = result.limit || "N/A";
    } else {
      // Handle the case where token is not found, if necessary
      // alert('Please register first.');
      // window.close();
    }
  });

  // Event listener for logout
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      chrome.storage.local.remove(["userToken", "userEmail"], () => {
          chrome.runtime.sendMessage({ action: "logout" }, () => {
            window.close(); 
          });
          window.close(); 
      });
    });
  } else {
    console.log("Logout button not found.");
  }

  updateSubscriptionStatus();
});


function showUserFeedback(message, type = "info") {
  const feedbackElement = document.getElementById("feedback");
  feedbackElement.textContent = message;
  feedbackElement.className = `feedback ${type}`;
  feedbackElement.style.display = "block";

  setTimeout(() => {
    feedbackElement.style.display = "none";
  }, 5000);
}

paymentButton.addEventListener("click", async function () {
  try {
      // Retrieve the Extension Account Token from Chrome storage
      const { userEmail } = await new Promise((resolve, reject) => {
          chrome.storage.local.get(["userEmail"], (items) => {
              if (chrome.runtime.lastError) {
                  return reject(new Error(chrome.runtime.lastError));
              }
              resolve(items);
          });
      });

      if (!userEmail) {
          showUserFeedback("No account found. Please log in first.", "error");
          return;
      }

      // Call the API to create the Stripe Checkout session
      const response = await fetch(BASE_URL + "payment", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify({
              Email: userEmail
          }),
      });

      const data = await response.json();
      console.log(data)
      if (response.ok && data.url) {
          // Redirect the user to the Stripe Checkout page
          window.open(data.url, "_blank");
      } else {
          showUserFeedback("Failed to initiate payment. Please try again later. Code:" + data.error, "error");
      }
  } catch (error) {
      console.error("Error initiating payment:", error);
      showUserFeedback("Failed to initiate payment. Please try again later.", "error");
  }
});

async function updateSubscriptionStatus() {
  const { userToken, userEmail } = await new Promise((resolve, reject) => {
    chrome.storage.local.get(["userToken", "userEmail"], (items) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError));
      }
      resolve(items);
    });
  });

  if (!userToken || !userEmail) {
    console.log("User token or email not found in storage.");
    return;
  }

  // Construct the URL with email and token (if they need to be in the URL)
  const url = `${BASE_URL}lookupextension/?name=Subscription&email=${encodeURIComponent(
    userEmail
  )}&secretKey=${userToken}`;

  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      responseStatusCode = response.status;
      return response.json();
    })
    .then((response) => {
      if (responseStatusCode === 200) {
        document.getElementById(
          "toSubscribeBlock"
        ).style = 'display:none';
        document.getElementById(
          "subscriptionBlock"
        ).style = 'display:block';
      }
      else {
        document.getElementById(
          "toSubscribeBlock"
        ).style = 'display:block';
        document.getElementById(
          "subscriptionBlock"
        ).style = 'display:none';
      }
    })

    .catch((error) => console.log("Error:", error));
}

