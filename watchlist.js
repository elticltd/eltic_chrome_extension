const people = {};

document.addEventListener("DOMContentLoaded", () => {
  const exportBtn = document.getElementById("export");
  const waitlist = document.getElementById("waitlist");

  let score = 1;

  if (exportBtn) {
    exportBtn.addEventListener("click", function (event) {
      event.preventDefault(); 
      downloadList(score);
    });
  }

  const lights = document.querySelectorAll(".light");
  lights.forEach((light) => {
    light.addEventListener("click", (e) => {
      score = parseInt(e.target.getAttribute("data-score"));
      changeList(score);
      updateList(score); 
    });
  });

  function attachRemoveListeners() {
    document.querySelectorAll(".remove-button").forEach((button) => {
      button.addEventListener("click", function () {
        const token = this.getAttribute("data-token");
        const score = this.getAttribute("data-score");
        removePerson(token, score);
      });
    });
  }

  async function changeList(score) {
    const lights = document.querySelectorAll(".light");
    lights.forEach((light) => light.classList.remove("active"));

    const selectedLight = document.querySelector(
      `.light[data-score="${score}"]`
    );
    if (selectedLight) {
      selectedLight.classList.add("active");
    }

    
    
    
    if (waitlist) {

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

        if (
          userToken &&
          userToken.length > 190 &&
          userEmail &&
          userEmail.length > 3
        ) {
          const url = `${BASE_URL}lookupextension/?name=WatchlistList::${score}&email=${encodeURIComponent(
            userEmail
          )}&secretKey=${userToken}`;

          const response = await fetch(url, {
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
                if (response != null && response != undefined) {
                  finalResult = JSON.parse(response);
                  let dataLoaded = "";
                  finalResult.forEach((person) => {
                    dataLoaded += `
      <div class='person-row' style='display: flex; align-items: center; margin-bottom: 5px;'>
        <div class='person-name' style='flex: 20%;'>
          <img src='${person.ProfilePictureFileName}' style='width: 60%; border-radius: 50%;'/>
        </div>
        <div class='person-name' style='flex: 50%; font-size: 16px;'>
          <a href='${person.LinkedInUrl}' target='_blank'>${person.FullName}</a>
        </div>
        <div class='person-action' style='flex: 30%; text-align: center;'>
          <button class="remove-button" data-token="${person.ExtensionWatchlistToken}" data-score="${score}">Remove</button>
        </div>
      </div>`;
                  });
                  dataLoaded += "";

                  if (dataLoaded == "") {
                    waitlist.innerHTML =
                      "<p>No data available, click on other lights or add from LinkedIn</p>";
                  } else {
                    waitlist.innerHTML = dataLoaded;
                    attachRemoveListeners();
                  }
                } else {
                  waitlist.innerHTML =
                    "<p>No data available, click on other lights or add from LinkedIn</p>";
                }
              }
            });
        }
      } catch (error) {
        console.log("Error fetching list:", error);
      }
    }
  }

  async function updateUI() {
    try {
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
        const url = `${BASE_URL}lookupextension/?name=WatchlistGroupCount&email=${encodeURIComponent(
          userEmail
        )}&secretKey=${userToken}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          document.getElementById("green").innerText = data.countScoreA || 0;
          document.getElementById("yellow").innerText = data.countScoreB || 0;
          document.getElementById("red").innerText = data.countScoreC || 0;
        }
      }
    } catch (error) {
      console.log("Error updating UI:", error);
    }
  }

  async function updateList(score) {
    try {
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
        const url = `${BASE_URL}lookupextension/?name=WatchlistList::${score}&email=${encodeURIComponent(
          userEmail
        )}&secretKey=${userToken}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          people[score] = data; // Store the fetched list in the people object
          changeList(score); // Update the display after fetching new data
        }
      }
    } catch (error) {
      console.log("Error fetching list:", error);
    }
  }

  async function removePerson(token, score) {
    try {
      const { userToken } = await new Promise((resolve, reject) => {
        chrome.storage.local.get(["userToken"], (items) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError));
          }
          resolve(items);
        });
      });

      if (userToken && userToken.length > 190) {
        let formData = JSON.stringify({
          FieldName: "Token",
          FieldValue: token,
          FieldName2: "Validation",
          FieldValue2: userToken,
        });

        // Send data to the server
        const response = await fetch(BASE_URL + "insertout/?id=&t=14", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: formData,
        });

        if (response.status === 200 || response.status === 201) {
          changeList(score);
          updateUI();
          showUserFeedback("Removed from Watchlist");
        } else {
          showUserFeedback(
            "Failed to remove from Watchlist, please try again."
          );
        }
      } else {
        showUserFeedback("Please log in first.");
      }
    } catch (error) {
      console.log("Error removing person:", error);
    }
  }

  async function downloadList(score) {
    try {
      const { userToken, userEmail } = await new Promise((resolve, reject) => {
        chrome.storage.local.get(["userToken", "userEmail"], (items) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError));
          }
          resolve(items);
        });
      });

      if (
        userToken &&
        userToken.length > 190 &&
        userEmail &&
        userEmail.length > 3
      ) {
        var tempScore = score.toString();
        let formData = JSON.stringify({
          FieldName: "Token",
          FieldValue: userEmail,
          FieldName2: tempScore,
          FieldValue2: userToken
        });

        // Send data to the server
        fetch(BASE_URL + "insertout/?id=&t=16", {
          method: "POST",
          headers: {
            charset: "UTF-8",
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: formData,
        })
        .then((response) => {
          responseStatusCode = response.status;
          return response.json();
        })
        .then((response) => {
          if (responseStatusCode === 200 || responseStatusCode === 201) {
            if (score == 1) {
              showUserFeedback("Export of Green List will be sent to your email.");
            }
            else if (score == 2) {
              showUserFeedback("Export of Yellow List will be sent to your email.");
            }
            else if (score == 3) {
              showUserFeedback("Export of Red List will be sent to your email.");
            }
          } else {
            showUserFeedback("Failed to request export. Try again.");
          }
        })
        .catch((error) => {
          console.log("Error:", error);
          showUserFeedback("Failed to request export. Try again later.");
        });
      } else {
        showUserFeedback("Please log in first.");
      }
    } catch (error) {
      console.log("Error with export request:", error);
    }
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

  updateUI();

  // Initialize with the green light (score 1) and update the list
  changeList(1);
});
