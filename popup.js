let token = null;
const DEBUG_MODE = true;

function log(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

// Usage:
log("Script loaded");

window.onerror = function (message, source, lineno, colno, error) {
  log("Unhandled error:", { message, source, lineno, colno, error });
  showUserFeedback(
    "An unexpected error occurred. Please try again later.",
    "error"
  );
  return true;
};

window.addEventListener("offline", () => {
  showUserFeedback(
    "You are currently offline. Some features may not work.",
    "info"
  );
});

window.addEventListener("online", () => {
  showUserFeedback("You are back online.", "success");
});

document.addEventListener("DOMContentLoaded", function () {
  // Function to update the UI based on login status
  function updateUIBasedOnLoginStatus() {
    chrome.storage.local.get("userToken", function (result) {
      if (result.userToken) {
        // Token found, show main content
        document.getElementById("main-content").style.display = "block";
        document.getElementById("register-content").style.display = "none";
      } else {
        // No token found, show only register content
        document.getElementById("main-content").style.display = "none";
        document.getElementById("register-content").style.display = "block";
      }
    });
  }

  updateUIBasedOnLoginStatus();

  // Listen for messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "logout") {
      updateUIBasedOnLoginStatus();
    }
  });

  const addToWatchlistBtn = document.getElementById("add-to-watchlist");
  const viewWatchlistBtn = document.getElementById("view-watchlist");
  const settingsBtn = document.getElementById("settings");
  const registerBtn = document.getElementById("register");
  const bulkuploadBtn = document.getElementById("bulkupload");

  if (addToWatchlistBtn) {
    addToWatchlistBtn.addEventListener("click", addToWatchlist);
  }

  if (viewWatchlistBtn) {
    viewWatchlistBtn.addEventListener("click", viewWatchlist);
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", openSettings);
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", showRegisterPrompt);
  }

  if (bulkuploadBtn) {
    bulkuploadBtn.addEventListener("click", showBulkUploadPrompt);
  }

  chrome.storage.local.get("userToken", function (result) {
    if (result.userToken) {
      // Token found, initialize the main popup
      token = result.userToken;

      // Show all buttons except register

      const group = document.getElementById("main-content");
      if (group) {
        group.style.display = "block";
      }
    } else {
      // No token found
      // Show only the register button
      const registerButton = document.getElementById("register-content");
      if (registerButton) {
        registerButton.style.display = "block";
      }
    }
  });

  updateWatchlistCount();
});

async function addToWatchlist() {
  try {
    // Get the current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error("No active tabs found.");
    }

    // Extract the vanity name from the LinkedIn URL
    const url = tabs[0].url;
    const prefix = "/in/";

    if (!url.includes(prefix)) {
      showUserFeedback("This is not a valid LinkedIn profile URL.", "error");
      return;
    }

    const vanityName = url
      .substring(url.indexOf(prefix) + prefix.length)
      .split("/")[0];

    // Retrieve userToken and userEmail from local storage
    const { userToken, userEmail } = await new Promise((resolve, reject) => {
      chrome.storage.local.get(["userToken", "userEmail"], (items) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError));
        }
        resolve(items);
      });
    });

    // Check if userToken and userEmail are valid
    if (
      userToken &&
      userToken.length > 190 &&
      userEmail &&
      userEmail.length > 3
    ) {
      let formData = JSON.stringify({
        FieldName: userEmail,
        FieldValue: vanityName,
        FieldName2: "Validation",
        FieldValue2: userToken,
      });

      // Send data to the server
      const response = await fetch(BASE_URL + "insertout/?id=&t=13", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: formData,
      });

      if (response.status === 200 || response.status === 201 || response.status === 202) {
        let message = await response.text();
        if (response.status === 202) {
          showUserFeedback(message.replace(/"/g, ''));
        }
        else {
          showUserFeedback("Added to Watchlist");
        }

      } else {
        showUserFeedback("Failed to add to Watchlist, please try again.");
      }
    } else {
      showUserFeedback("Please log in first.");
    }

    updateWatchlistCount();
  } catch (error) {
    console.log("Error adding to watchlist:", error);
    showUserFeedback("Failed to add to watchlist. Please try again.", "error");
  }
}

function viewWatchlist() {
  chrome.windows.create({
    url: chrome.runtime.getURL("watchlist.html"),
    type: "popup",
    width: 800,
    height: 600,
  });
}

function openSettings() {
  chrome.windows.create({
    url: chrome.runtime.getURL("settings.html"),
    type: "popup",
    width: 600,
    height: 250,
  });
}

async function updateWatchlistCount() {
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
  const url = `${BASE_URL}lookupextension/?name=WatchlistCount&email=${encodeURIComponent(
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
      if (responseStatusCode === 200 || responseStatusCode === 201) {
        document.getElementById(
          "view-watchlist"
        ).innerText = `View (${response})`;
      }
    })

    .catch((error) => console.log("Error:", error));
}

async function handleAuthError() {
  await chrome.storage.local.remove("token");
  token = null;
  showRegisterPrompt();
}

function showUserFeedback(message, type = "info") {
  const feedbackElement = document.getElementById("feedback");
  feedbackElement.textContent = message;
  feedbackElement.className = `feedback ${type}`;
  feedbackElement.style.display = "block";

  setTimeout(() => {
    feedbackElement.style.display = "none";
  }, 5000);
}

function showRegisterPrompt() {
  chrome.windows.create({
    url: chrome.runtime.getURL("register.html"),
    type: "popup",
    width: 400,
    height: 450,
  });
}

function showBulkUploadPrompt() {
  chrome.windows.create({
    url: chrome.runtime.getURL("bulkupload.html"),
    type: "popup",
    width: 400,
    height: 430,
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "refreshPopup") {
    location.reload();
  }
});
