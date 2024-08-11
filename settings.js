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
        if (chrome.runtime.lastError) {
          console.error(
            "Error clearing local storage: ",
            chrome.runtime.lastError
          );
        } else {
          console.log(
            "User logged out, token and email cleared from local storage."
          );
          showUserFeedback("You have been logged out.");

          chrome.runtime.sendMessage({ action: "logout" }, () => {
            window.close(); // Close the settings page
          });
          
          
        }
      });
    });
  } else {
    console.error("Logout button not found.");
  }

  // Event listener for save settings
  const saveSettingsButton = document.getElementById("save-settings");
  if (saveSettingsButton) {
    saveSettingsButton.addEventListener("click", saveSettings);
  } else {
    console.error("Save settings button not found.");
  }
});

function saveSettings() {
  let email = document.getElementById("email").value;

  fetch("https://eltic.io/settings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: email }),
  })
    .then((response) => response.json())
    .then((data) => {
      chrome.storage.local.set(
        { email: email, limit: data.limit },
        function () {
          chrome.runtime.sendMessage({ action: 'logout' });
          showUserFeedback("Settings saved successfully");
          window.close();
        }
      );
    })
    .catch((error) => {
      console.log("Error:", error);
    });
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
