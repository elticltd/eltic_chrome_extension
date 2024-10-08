document.addEventListener("DOMContentLoaded", function () {
  const sendVanityNamesBtn = document.getElementById("sendVanityNamesBtn");
  const vanityNamesInput = document.getElementById("vanityNamesInput");
  const feedback = document.getElementById("feedback");
  let lastSubmittedValue = "";

  sendVanityNamesBtn.addEventListener("click", async function () {
    const vanityNames = vanityNamesInput.value.trim();

    if (vanityNames) {
      if (vanityNames === lastSubmittedValue) {
        // If the current value is the same as the last submitted value, don't submit
        showUserFeedback("Already submitted.");
        return;
      }
      lastSubmittedValue = vanityNames;

      // Clean and split the input into an array of vanity names
      const cleanedVanityNames = vanityNames
        .split(/[,;\n\r]+/)
        .map((name) => {
          let trimmedName = name.trim();
          // Remove 'www.' if it exists after removing 'https://'
          trimmedName = trimmedName.replace("https://", "");
          trimmedName = trimmedName.replace("www.", "");

          // Replace '/' with '~|~'
          trimmedName = trimmedName.replace(/\//g, "~|~");
          return trimmedName;
        })
        .filter((name) => name); // Filter out empty strings

      const encodedVanityNames = cleanedVanityNames.map((name) =>
        encodeURIComponent(name)
      );
      const encodedVanityNamesString = encodedVanityNames.join(",");

      try {
        const { userToken, userEmail } = await new Promise(
          (resolve, reject) => {
            chrome.storage.local.get(["userToken", "userEmail"], (items) => {
              if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError));
              }
              resolve(items);
            });
          }
        );

        // Check if userToken and userEmail are valid
        if (
          userToken &&
          userToken.length > 190 &&
          userEmail &&
          userEmail.length > 3
        ) {
          let formData = JSON.stringify({
            FieldName: "ExtensionBulkUpload",
            FieldValue: encodedVanityNamesString,
            FieldName2: userEmail,
            FieldValue2: userToken,
          });

          // Create a fetch request
          const fetchRequest = fetch(BASE_URL + "insertout/?id=&t=15", {
            method: "POST",
            headers: {
              charset: "UTF-8",
              "content-type": "application/json",
              accept: "application/json",
            },
            body: formData,
          });

          // Create a timeout promise that resolves after 4 seconds
          const timeout = new Promise((resolve) => {
            setTimeout(resolve, 4000);
          });

          // Use Promise.race to race the fetch request against the timeout
          await Promise.race([fetchRequest, timeout])
            .then((response) => {
              if (response && response.ok) {
                response.json().then((data) => {
                  let message = data;
                  if (response.status === 202) {
                    showUserFeedback(message.replace(/"/g, ""));
                  } else {
                    showUserFeedback("Added to Watchlist");
                    chrome.runtime.sendMessage(
                      { action: "logout" },
                      function (response) {}
                    );
                    window.close();
                  }
                });
              } else {
                showUserFeedback("Failed to send data. Try again.");
              }
            })
            .catch((error) => {
              showUserFeedback("Error submitting. Try again later.");
            });

          // Close the window after 4 seconds, regardless of the fetch outcome
          setTimeout(() => {
            window.close();
          }, 4000);
        }
      } catch (error) {
        console.log("Error:", error);
        showUserFeedback("Error. Try again later.", "error");
      }
    } else {
      showUserFeedback(
        "Please specify at least one LinkedIn profile.",
        "error"
      );
    }
  });


  function showUserFeedback(message, type = "info") {
    feedback.textContent = message;
    feedback.className = `feedback ${type}`;
    feedback.style.display = "block";
    setTimeout(() => {
      feedback.style.display = "none";
    }, 5000);
  }
});
